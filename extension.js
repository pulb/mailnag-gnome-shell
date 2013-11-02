/* Mailnag - GNOME-Shell extension frontend
*
* Copyright 2013 Patrick Ulbrich <zulu99@gmx.net>
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
const MessageTray = imports.ui.messageTray;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Indicator = Me.imports.indicator;
const Source = Me.imports.source;

const MAX_VISIBLE_MAILS = 10;
const AVATAR_ICON_SIZE = 42;

// TODO : move to extension settings
// CAUTION: these variable are accessed in enable() as well!
const SHOW_NOTIFICATIONS = true;
const SHOW_INDICATOR = true;
const SHOW_AVATARS = true;
		
const MailnagIface = <interface name="mailnag.MailnagService">
<method name="GetMails">
    <arg type="aa{sv}" direction="out" />
</method>
<method name="GetMailCount">
    <arg type="u" direction="out" />
</method>
<signal name="MailsAdded">
    <arg type="u" />
</signal>
<signal name="MailsRemoved">
    <arg type="u" />
</signal>
</interface>;

const MailnagDbus = Gio.DBusProxy.makeProxyWrapper(MailnagIface);

const MailnagExtension = new Lang.Class({
	Name: 'MailnagExtension',
	
	_init: function(enableNotifications, enableIndicator, avatars) {
		
		this._mails = [];
		this._avatars = avatars;
		this._enableNotifications = enableNotifications;
		this._enableIndicator = enableIndicator;
		this._source = null;
		this._indicator = null;
		
		this._proxy = new MailnagDbus(Gio.DBus.session,
			'mailnag.MailnagService', '/mailnag/MailnagService');
			
		this._onMailsAddedId = this._proxy.connectSignal('MailsAdded',
        	Lang.bind(this, this._onMailsAdded));
        
        this._onMailsRemovedId = this._proxy.connectSignal('MailsRemoved',
        	Lang.bind(this, this._onMailsRemoved));
        
       	// TODO : what if Mailnag sends a MailsAdded signal here or after _getMailsAsync()
       	// (should happen *extemely* rarely)?
       	// Is it possible to prevent the extension from notifying twice?
       	
        // Mailnag possibly fired a 'MailsAdded' signal before this extension was started,
        // so check if Mailnag fetched mails already and pull them manually.
        let mailCount = this._proxy.GetMailCountSync();
        if (mailCount > 0) {
        	this._getMailsAsync();
        }
	},
	
	_getMailsAsync : function() {
		this._proxy.GetMailsRemote(Lang.bind(this,
			function(result, error) {
				if (!error) {
					this._mails = result[0];
					
					if (this._enableNotifications) {
						if (this._source == null) {
							this._source = new Source.MailnagSource(MAX_VISIBLE_MAILS);
							// Make sure we get informed if the user 
							// closes our notification source.
							this._source.connect('destroy', Lang.bind(this, function() {
								this._source = null;
							}));
							
							Main.messageTray.add(this._source);
						}
						this._source.notifySummary(this._mails);
					}
					
					if (this._enableIndicator)	{
						if (this._indicator == null) {
							this._createIndicator();
						} else {
							this._indicator.setMails(this._mails);
						}
					}
				}
			}));
	},
	
	_onMailsAdded: function(proxy, sender, newCount) {
		this._getMailsAsync();
	},
	
	_onMailsRemoved: function(proxy, sender, newCount) {
		// TODO : not only support removal of *all* mails
		if (newCount == 0) {
			this._mails = [];
		
			// TODO : update messagtray source
			// (source probably needs to call this.countUpdated() manually)
			
			if (this._indicator != null) {
				if (this._mails.length == 0) {
					this._destroyIndicator();
				} else {
					this._indicator.setMails(this._mails);
				}
			}
		}
	},
	
	_createIndicator: function() {
		this._indicator = new Indicator.MailnagIndicator(
				MAX_VISIBLE_MAILS, this._avatars, AVATAR_ICON_SIZE);
		
		this._indicator.setMails(this._mails);
		Main.panel.addToStatusArea('mailnag-indicator', this._indicator, 0);
	},
	
	_destroyIndicator: function() {
		if (this._indicator != null) {
			this._indicator.destroy();
			this._indicator = null;
		}
	},
	
	enableIndicator: function() {
		if ((this._indicator == null) && (this._mails.length > 0)) {
			this._createIndicator();
		}
		
		this._enableIndicator = true;
	},
	
	disableIndicator: function() {
		this._destroyIndicator();
		this._enableIndicator = false;
	},
	
	dispose: function() {
		if (this._onMailsAddedId > -1) {
			this._proxy.disconnectSignal(this._onMailsAddedId);
		}
		
		if (this._onMailsRemovedId > -1) {
			this._proxy.disconnectSignal(this._onMailsRemovedId);
		}
		
		if (this._source != null) {
			this._source.destroy();
			this._source = null;
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
			Lang.bind(this, function(pid, status, requestObject) {
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
			}));
	}
}

let ext = null;
let watch_id = -1;
let enabled = false;

function init() {
}

function enable() {
	if (enabled) {
		// Re-enable the indicator when the exteion is re-enabled on screen unlock.
		if ((ext != null) && SHOW_INDICATOR) ext.enableIndicator();
		return;
	}
	
	watch_id = Gio.DBus.session.watch_name('mailnag.MailnagService', Gio.BusNameWatcherFlags.NONE,
		function (owner) {
			if (SHOW_AVATARS) {
				aggregateAvatarsAsync(function(avatars) {
						ext = new MailnagExtension(
									SHOW_NOTIFICATIONS, 
									SHOW_INDICATOR, avatars);
					});
			} else {
				ext = new MailnagExtension(
									SHOW_NOTIFICATIONS, 
									SHOW_INDICATOR, {});
			}
		},
		function (owner) {
			if (ext != null) {
				ext.dispose();
				ext = null;
			}
		});
	
	enabled = true;
}

function disable() {
	let isLockScreenMode = !Main.sessionMode.allowExtensions;
	// Don't allow the extension to be disabled on lockscreen activation.
	// Just remove the indicator from the top panel.
	if (isLockScreenMode) {
		if (ext != null) ext.disableIndicator();
	} else {
		if (watch_id > -1) {
			// TODO : test: does this call the function (owner) callback, so ext.dispose() is called twice?
			Gio.DBus.session.unwatch_name(watch_id);
		}
		
		if (ext != null) {
			ext.dispose();
			ext = null;
		}
		
		enabled = false;
	}
}
