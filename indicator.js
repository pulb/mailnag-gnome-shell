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

const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Util = imports.misc.util;
const Pango = imports.gi.Pango;
const PopupMenu = imports.ui.popupMenu;
const PanelMenu = imports.ui.panelMenu;
const Lang = imports.lang;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;

const INDICATOR_ICON = 'mail-unread-symbolic'

const IndicatorMailMenuItem = new Lang.Class({
	Name: 'IndicatorMailMenuItem',
	Extends: PopupMenu.PopupBaseMenuItem,

	_init: function(mail, avatars, avatarSize, extension) {
		this.parent();
		
		let [sender, size] = mail['sender_name'].get_string();
		let [senderAddr, size] = mail['sender_addr'].get_string();
		let [subject, size] = mail['subject'].get_string();
		let [mail_id, size] = mail['id'].get_string();
		
		if (sender.length == 0) sender = senderAddr;
		
		let hbox = new St.BoxLayout({ vertical: false, x_expand: true, style_class: 'menu-item-box' });
		
		let vbox = new St.BoxLayout({ vertical: true, x_expand: true });
		let senderLabel = new St.Label({ text: sender, style_class: 'sender-label' });
		let subjectLabel = new St.Label({ text: subject, style_class: 'subject-label' });
		
		/* TODO : somehow these linewrap settings are ignored... */
		senderLabel.clutter_text.line_wrap = false;
		senderLabel.clutter_text.ellipsize = Pango.EllipsizeMode.END;
		subjectLabel.clutter_text.line_wrap = false;
		subjectLabel.clutter_text.ellipsize = Pango.EllipsizeMode.END;
		
		vbox.add(senderLabel);
		vbox.add(subjectLabel);
		
		hbox.add(vbox);
		
		let avatarFile = avatars[senderAddr.toString().toLowerCase()];
		if (avatarFile != undefined) {
			let iconBin = new St.Bin({ style_class: 'avatar',
									   style: 'background-image: url("%s")'.format(avatarFile),
									   width: avatarSize, height: avatarSize,
									   x_fill: true,
									   y_fill: true });
			hbox.add(iconBin);
		} else {
			/*hbox.add(new St.Icon({ icon_name: 'avatar-default', 
											  icon_size: avatarSize }));*/
		}
		
		let closeButton = new St.Button({ reactive: true, can_focus: true, 
										  track_hover: true, style_class: 'mark-as-read-button' });
		
		closeButton.connect('clicked', function() {
			extension.markMailAsRead(mail_id);
		});
		
		closeButton.child = new St.Icon({ icon_name: 'edit-delete-symbolic', 
								style_class: 'popup-menu-icon' });
		
		hbox.add(closeButton);

		this.actor.add_child(hbox);
	}
});

const MailnagIndicator = new Lang.Class({
	Name: 'MailnagIndicator',
	Extends: PanelMenu.Button,
	
	_init: function(maxVisibleMails, avatars, avatarSize, extension) {
		this.parent(0.0, this.Name);
		this._maxVisisbleMails = maxVisibleMails;
		this._avatars = avatars;
		this._avatarSize = avatarSize;
		this._extension = extension;
		
		let icon = new St.Icon({
			icon_name: INDICATOR_ICON,
			style_class: 'system-status-icon'});

		this._iconBin = new St.Bin({ child: icon,
									 x_fill: false,
									 y_fill: false });
		
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
		
		this.setMails([]);
	},
	
	_allocate: function(actor, box, flags) {
		// the iconBin should fill our entire box
		this._iconBin.allocate(box, flags);

		// get the allocation box of the indicator icon
		let iconBox = this._iconBin.child.get_allocation_box();
		// create a temporary box for calculating the counter allocation
		let childBox = new Clutter.ActorBox();

		let [minWidth, minHeight, naturalWidth, naturalHeight] = this._counterBin.get_preferred_size();
		let direction = this.actor.get_text_direction();

		if (direction == Clutter.TextDirection.LTR) {
			// allocate on the right in LTR
			childBox.x1 = iconBox.x2 - (naturalWidth / 2);
			childBox.x2 = childBox.x1 + naturalWidth;
		} else {
			// allocate on the left in RTL
			childBox.x1 = iconBox.x1 - (naturalWidth / 2);
			childBox.x2 = childBox.x1 + naturalWidth;
		}

		childBox.y1 = iconBox.y2 - (naturalHeight / 2);
		childBox.y2 = childBox.y1 + naturalHeight;

		this._counterBin.allocate(childBox, flags);
    },
    
	_updateMenu: function(mails) {
		this.menu.removeAll();
		
		let item = null;
		let maxMails = (mails.length <= this._maxVisisbleMails) ? 
							mails.length : this._maxVisisbleMails;
		
		for (let i = 0; i < maxMails; i++) {
			item = new IndicatorMailMenuItem(mails[i], this._avatars, 
				this._avatarSize, this._extension);
			
			item.connect('activate', function() {
				Utils.openDefaultMailReader();
			});
			
			this.menu.addMenuItem(item);
		}
		
		if (mails.length > this._maxVisisbleMails) {
			let str = _("(and {0} more)").replace("{0}", (mails.length - this._maxVisisbleMails));
			item = new PopupMenu.PopupBaseMenuItem();
			item.actor.style_class = 'menu-item-more-box';
			item.actor.add_child(new St.Label({ text: str }));
			
			this.menu.addMenuItem(item);
		}
		
		if (mails.length > 0) {
			this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem())
			
			item = new PopupMenu.PopupMenuItem(_("Mark All As Read"));
			item.connect('activate', Lang.bind(this, function() {
				this._extension.markAllMailsAsRead();
			}));
			this.menu.addMenuItem(item);
		}
		
		item = new PopupMenu.PopupMenuItem(_("Check For Mail"));
		item.connect('activate', Lang.bind(this, function() {
			this._extension.checkForMails();
		}));
		this.menu.addMenuItem(item);

		
		this._add_settings_submenu(this.menu);
	},
	
	_add_settings_submenu: function(menu) {
		let item = null;
		let subMenu = new PopupMenu.PopupSubMenuMenuItem(_("Settings"), false);
		item = new PopupMenu.PopupMenuItem(_("Mailnag Settings"));
		item.connect('activate', function() {
			Utils.launchApp('mailnag-config.desktop');
		});
		
		subMenu.menu.addMenuItem(item);
		
		item = new PopupMenu.PopupMenuItem(_("Extension Settings"));
		item.connect('activate', function() {
			Util.spawn(['gnome-shell-extension-prefs', 'mailnag@pulb.github.com']);
		});
						
		subMenu.menu.addMenuItem(item);
		
		menu.addMenuItem(subMenu);
	},
	
	setMails: function(mails) {
		let label = mails.length <= 99 ? mails.length.toString() : "...";
		this._counterLabel.set_text(label);
		this._counterBin.visible = (mails.length > 0);
		this._updateMenu(mails);
	}
});
