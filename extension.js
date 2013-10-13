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
const St = imports.gi.St;
const PopupMenu = imports.ui.popupMenu;
const MessageTray = imports.ui.messageTray;
const Gio = imports.gi.Gio;
const Lang = imports.lang;

const SOURCE_ICON = 'mail-unread';
const MAX_VISIBLE_MAILS = 10;

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
	
	_init : function() {
		this._enableNotifications = true;
		this._source = null;
		
		this._proxy = new MailnagDbus(Gio.DBus.session,
			'mailnag.MailnagService', '/mailnag/MailnagService');
			
		this._onMailsAddedId = this._proxy.connectSignal('MailsAdded',
        	Lang.bind(this, this._onMailsAdded));
        
        this._onMailsRemovedId = this._proxy.connectSignal('MailsRemoved',
        	Lang.bind(this, this._onMailsRemoved));
        
       	// TODO : what if Mailnag sends a MailsAdded signal here (should happen *extemely* rarely)?
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
					if (this._enableNotifications) {
						if (this._source == null) {
							this._source = new MailnagSource();
							// Make sure we get informed if the user 
							// closes our notification source.
							this._source.connect('destroy', Lang.bind(this, function() {
								this._source = null;
							}));
							
							Main.messageTray.add(this._source);
						}
						this._source.notifySummary(result[0]);
					}
				}
			}));
	},
	
	_onMailsAdded: function(proxy, sender, newCount) {
		this._getMailsAsync();
	},
	
	_onMailsRemoved: function(proxy, sender, newCount) {
		// TODO
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
		
		// TODO : dispose topbar icon
	}
});

const MailnagSource = new Lang.Class({
	Name: 'MailnagSource',
	Extends: MessageTray.Source,

	_init: function() {
		this._count = 0;
		this.parent("Mailnag", SOURCE_ICON);
	},

	get count() {
        return this._count;
    },

    get indicatorCount() {
        return this._count;
    },

    get unseenCount() {
        // TODO : Return count of mails newly reported by mailnag?
        if ((this.notifications.length > 0) && (!this.notifications[0].acknowledged)) {
        	return this._count;
        } else {
        	return 0;
        }
    },

	notifySummary: function(mails) {
		let summary = "";
		let body = "";
		let maxMails = (mails.length <= MAX_VISIBLE_MAILS) ? 
							mails.length : MAX_VISIBLE_MAILS;
							
		this._count = mails.length;
		
		for (let i = 0; i < maxMails; i++) {
			sender = mails[i]['sender_name'].get_string()[0];
			if (sender.length == 0) sender = mails[i]['sender_addr'].get_string()[0];
			body += sender + ":\n<i>" + mails[i]['subject'].get_string()[0] + "</i>\n\n";
		}
		
		if (mails.length > MAX_VISIBLE_MAILS) {
			body += "<i>" + _("(and {0} more)").replace("{0}", (mails.length - MAX_VISIBLE_MAILS)) + "</i>";
		}
		
		if (mails.length > 1) {
			summary = _("You have {0} new mails.").replace("{0}", mails.length);
		} else {
			summary = _("You have a new mail.");
		}
		
		let params = { bannerMarkup : true };
		let n = null;
		if (this.notifications.length == 0) {
			n = new Main.MessageTray.Notification(this, 
					summary, body, params);
		} else {
			n = this.notifications[0];
			n.update(summary, body, params);
		}
		
		this.notify(n);
	}
});

let ext = null;
let watch_id = -1;
let enabled = false;

function init() {
}

function enable() {
	if (enabled)
		return;
	
	watch_id = Gio.DBus.session.watch_name('mailnag.MailnagService', Gio.BusNameWatcherFlags.NONE,
		function(owner) {
			ext = new MailnagExtension();
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
	// Don't allow the extension to be disabled on lockscreen activation
	if (!isLockScreenMode)
	{
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
