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
const Clutter = imports.gi.Clutter;
const PopupMenu = imports.ui.popupMenu;
const MessageTray = imports.ui.messageTray;
const PanelMenu = imports.ui.panelMenu;
const Gio = imports.gi.Gio;
const Lang = imports.lang;

const SOURCE_ICON = 'mail-unread';
const MAX_VISIBLE_MAILS = 10;

// TODO : move to extension settings
// CAUTION: these variable are accessed in enable() as well!
const SHOW_NOTIFICATIONS = true;
const SHOW_INDICATOR = true;
		
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
	
	_init: function(enableNotifications, enableIndicator) {
		
		this._mails = new Array();
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
							this._source = new MailnagSource();
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
			this._mails = new Array();
		
			// TODO : update messagtray source
			
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
		this._indicator = new Indicator();
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

const Indicator = new Lang.Class({
	Name: 'MailnagIndicator',
	Extends: PanelMenu.Button,
	
	_init: function() {
		this.parent(0.0, this.Name);
		
		let icon = new St.Icon({
			icon_name: 'mail-unread-symbolic',
			style_class: 'system-status-icon'});

		this._iconBin = new St.Bin({ child: icon,
									 /*width: icon.width, height: icon.height,*/
									 x_fill: true,
									 y_fill: true });

		this._counterLabel = new St.Label({ text: "0",
											x_align: Clutter.ActorAlign.CENTER,
											x_expand: true,
											y_align: Clutter.ActorAlign.CENTER,
											y_expand: true });
		
		this._counterBin = new St.Bin({ style_class: 'mailnag-counter',
										child: this._counterLabel,
										layout_manager: new Clutter.BinLayout() });

		this._counterBin.connect('style-changed', Lang.bind(this, function() {
			let themeNode = this._counterBin.get_theme_node();
			this._counterBin.translation_x = themeNode.get_length('-mailnag-counter-overlap-x');
			this._counterBin.translation_y = themeNode.get_length('-mailnag-counter-overlap-y');
		}));
            
        this.actor.add_actor(this._iconBin);                      
		this.actor.add_actor(this._counterBin);
	},
	
	_allocate: function(actor, box, flags) {
		// the iconBin should fill our entire box
		this._iconBin.allocate(box, flags);

		let childBox = new Clutter.ActorBox();

		let [minWidth, minHeight, naturalWidth, naturalHeight] = this._counterBin.get_preferred_size();
		let direction = this.actor.get_text_direction();

		if (direction == Clutter.TextDirection.LTR) {
			// allocate on the right in LTR
			childBox.x1 = box.x2 - naturalWidth;
			childBox.x2 = box.x2;
		} else {
			// allocate on the left in RTL
			childBox.x1 = 0;
			childBox.x2 = naturalWidth;
		}

		childBox.y1 = box.y2 - naturalHeight;
		childBox.y2 = box.y2;

		this._counterBin.allocate(childBox, flags);
    },
    
    _getPreferredWidth: function (actor, forHeight, alloc) {
        let [min, nat] = this._iconBin.get_preferred_width(forHeight);
        alloc.min_size = min; alloc.nat_size = nat;
    },

    _getPreferredHeight: function (actor, forWidth, alloc) {
        let [min, nat] = this._iconBin.get_preferred_height(forWidth);
        alloc.min_size = min; alloc.nat_size = nat;
    },
	
	setMails: function(mails) {
		this._counterLabel.set_text(mails.length.toString());
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
			let sender = mails[i]['sender_name'].get_string()[0];
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
			// this.notify() updates the counter badge for *new* notifications only
			// so update the counter manually in case of an updated notification.
			this.countUpdated();
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
	if (enabled) {
		// Re-enable the indicator when the exteion is re-enabled on screen unlock.
		if ((ext != null) && SHOW_INDICATOR) ext.enableIndicator();
		return;
	}
	
	watch_id = Gio.DBus.session.watch_name('mailnag.MailnagService', Gio.BusNameWatcherFlags.NONE,
		function(owner) {
			ext = new MailnagExtension(SHOW_NOTIFICATIONS, SHOW_INDICATOR);
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
