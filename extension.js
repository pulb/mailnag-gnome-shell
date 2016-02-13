/* Mailnag - GNOME-Shell extension frontend
*
* Copyright 2013 - 2016 Patrick Ulbrich <zulu99@gmx.net>
*
* This program is free software; you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation; either version 2 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program; if not, write to the Free Software
* Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston,
* MA 02110-1301, USA.
*/

const Main = imports.ui.main;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Indicator = Me.imports.indicator;

const AVATAR_ICON_SIZE = 42;

const SHOW_AVATARS_KEY			= 'show-avatars';
const MAX_VISIBLE_MAILS_KEY		= 'max-visible-mails';
const REMOVE_INDICATOR_KEY		= 'remove-indicator';
		
const MailnagIface =
'<node>\
	<interface name="mailnag.MailnagService">\
		<method name="GetMails">\
			<arg type="aa{sv}" direction="out" />\
		</method>\
		<method name="GetMailCount">\
			<arg type="u" direction="out" />\
		</method>\
		<method name="Shutdown" />\
		<method name="CheckForMails" />\
		<method name="MarkMailAsRead">\
			<arg type="s" direction="in" />\
		</method>\
		<signal name="MailsAdded">\
			<arg type="aa{sv}" />\
			<arg type="aa{sv}" />\
		</signal>\
		<signal name="MailsRemoved">\
			<arg type="aa{sv}" />\
		</signal>\
	</interface>\
</node>';

const MailnagDbus = Gio.DBusProxy.makeProxyWrapper(MailnagIface);

const MailnagExtension = new Lang.Class({
	Name: 'MailnagExtension',
	
	_init: function(maxVisibleMails, removeIndicator, avatars) {
		
		this._mails = [];
		this._avatars = avatars;
		this._maxVisibleMails = maxVisibleMails;
		this._removeIndicator = removeIndicator;
		this._indicator = null;
		
		this._proxy = new MailnagDbus(Gio.DBus.session,
			'mailnag.MailnagService', '/mailnag/MailnagService');
			
		this._onMailsAddedId = this._proxy.connectSignal('MailsAdded',
			Lang.bind(this, this._onMailsAdded));
		
		this._onMailsRemovedId = this._proxy.connectSignal('MailsRemoved',
			Lang.bind(this, this._onMailsRemoved));
		
		// TODO : what if Mailnag sends a MailsAdded signal here or after GetMailsRemote()
		// (should happen *extremely* rarely)?
		// Is it possible to prevent the extension from notifying twice?
		
		// Mailnag possibly fired a 'MailsAdded' signal before this extension was started,
		// so check if Mailnag fetched mails already and pull them manually.
		this._proxy.GetMailsRemote(Lang.bind(this,
			function([mails], error) {
				if (!error) {
					if ((mails.length > 0) || !this._removeIndicator) {
						this._handle_new_mails(mails, mails);
					}
				}
			}));
	},
	
	_onMailsAdded: function(proxy, sender, [new_mails, all_mails]) {
		this._handle_new_mails(new_mails, all_mails);
	},
	
	_onMailsRemoved: function(proxy, sender, [remaining_mails]) {
		// TODO : not only support removal of *all* mails
		if (remaining_mails.length == 0) {
			this._mails = [];
			
			if (this._indicator != null) {
				if ((this._mails.length == 0) && this._removeIndicator) {
					this._destroyIndicator();
				} else {
					this._indicator.setMails(this._mails);
				}
			}
		}
	},
	
	_handle_new_mails: function(new_mails, all_mails) {
		this._mails = all_mails;
		
		if (this._indicator == null) {
			this._createIndicator();
		} else {
			this._indicator.setMails(all_mails);
		}
	},
	
	_createIndicator: function() {
		this._indicator = new Indicator.MailnagIndicator(
				this._maxVisibleMails, this._avatars, AVATAR_ICON_SIZE, this);
		
		this._indicator.setMails(this._mails);
		Main.panel.addToStatusArea('mailnag-indicator', this._indicator, 0);
	},
	
	_destroyIndicator: function() {
		if (this._indicator != null) {
			this._indicator.destroy();
			this._indicator = null;
		}
	},
	
	markMailAsRead: function(mail_id) {
		// Find the mail object with the specified mail_id
		let idx = -1;
		for (let i = 0; i < this._mails.length; i++) {
			[id, size] = this._mails[i]['id'].get_string();
			if (id == mail_id) {
				idx = i;
				break;
			}
		}
		
		// There is no mail object with the specified mail_id -> return
		if (idx == -1)
			return;
		
		// Remove mail from local mail list
		this._mails.splice(idx, 1);
		
		// Notify the Mailnag daemon to mark the mail as read
		this._proxy.MarkMailAsReadRemote(mail_id, function(result, error) {
			if (error) {
				log("Error: markMailAsReadRemote() failed.");
			}
		});
		
		// Update Panel Indicator		
		if ((this._mails.length == 0) && this._removeIndicator) {
			this._destroyIndicator();
		} else {
			if (this._indicator != null)
				this._indicator.setMails(this._mails);
		}
	},
	
	markAllMailsAsRead: function() {
		// TODO: add a markAllMailsAsRead() method to the DBus interface
		for (let i = 0; i < this._mails.length; i++) {
			[id, size] = this._mails[i]['id'].get_string();
		
			// Notify the Mailnag daemon to mark the mail as read
			this._proxy.MarkMailAsReadRemote(id, function(result, error) {
				if (error) {
					log("Error: markMailAsReadRemote() failed.");
				}
			});
		}
		
		this._mails = [];
		
		if (this._removeIndicator) {
			this._destroyIndicator();
		} else {
			if (this._indicator != null)
				this._indicator.setMails(this._mails);
		}
	},
	
	checkForMails: function() {
		this._proxy.CheckForMailsRemote(function(result, error) {
			if (error) {
				log("Error: checkForMailsRemote() failed.");
			}
		});
	},
	
	dispose: function() {
		if (this._onMailsAddedId > -1) {
			this._proxy.disconnectSignal(this._onMailsAddedId);
			this._onMailsAddedId = -1;
		}
		
		if (this._onMailsRemovedId > -1) {
			this._proxy.disconnectSignal(this._onMailsRemovedId);
			this._onMailsRemovedId = -1;
		}
		
		this._destroyIndicator();
	}
});

function aggregateAvatarsAsync(completedCallback) {
	let aggregator = "aggregate-avatars";
	let result = null;
	let avatars = {};

	try {
		result = GLib.spawn_async_with_pipes(
			null, [aggregator], 
			null, GLib.SpawnFlags.SEARCH_PATH | 
					GLib.SpawnFlags.DO_NOT_REAP_CHILD, null);
	} catch (ex) {
		try {
			result = GLib.spawn_async_with_pipes(
				Me.path, [aggregator], 
				null, GLib.SpawnFlags.DO_NOT_REAP_CHILD, null);
		} catch (ex) {
			logError(ex, "Failed to spawn '%s'".format(aggregator));
		}
	}

	if (result == null) {
		completedCallback(avatars);
	} else {
		let [res, pid, stdin_fd, stdout_fd, stderr_fd] = result;		
		let stdout = new Gio.DataInputStream({ 
				base_stream: new Gio.UnixInputStream({ fd: stdout_fd, close_fd: true })});

		GLib.close(stdin_fd);
		GLib.close(stderr_fd);

		let childWatch = GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, 
			function(pid, status, requestObject) {
				let [out, size] = stdout.read_line(null);

				if (size > 0) {
					let lst = out.toString().split(";");
					for (let i = 0; i < lst.length; i += 2) {
						let email = lst[i].toLowerCase();
						let avatarFile = lst[i + 1];
						avatars[email] = avatarFile;
					}
				}

				stdout.close(null);
				GLib.source_remove(childWatch);
				completedCallback(avatars);
			});
	}
}

let ext = null;
let watch_id = -1;
let settings = null;

function init() {
}

function enable() {	
	settings = Convenience.getSettings();
		
	watch_id = Gio.DBus.session.watch_name('mailnag.MailnagService', Gio.BusNameWatcherFlags.NONE,
		function (owner) {
			if (settings.get_boolean(SHOW_AVATARS_KEY)) {
				aggregateAvatarsAsync(function(avatars) {
						ext = new MailnagExtension(
									settings.get_int(MAX_VISIBLE_MAILS_KEY),
									settings.get_boolean(REMOVE_INDICATOR_KEY),
									avatars);
					});
			} else {
				ext = new MailnagExtension(
									settings.get_int(MAX_VISIBLE_MAILS_KEY),
									settings.get_boolean(REMOVE_INDICATOR_KEY),
									{});
			}
		},
		function (owner) {
			if (ext != null) {
				ext.dispose();
				ext = null;
			}
		});
}

function disable() {
	if (watch_id > -1) {
		// TODO : test: does this call the function (owner) callback, so ext.dispose() is called twice?
		Gio.DBus.session.unwatch_name(watch_id);
		watch_id = -1;
	}
	
	if (settings != null) {
		settings.run_dispose();
		settings = null;
	}
	
	if (ext != null) {
		ext.dispose();
		ext = null;
	}
}
