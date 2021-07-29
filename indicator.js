/* Mailnag - GNOME-Shell extension frontend
*
* Copyright 2013 - 2020 Patrick Ulbrich <zulu99@gmx.net>
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

const { Clutter, St, Pango, GObject } = imports.gi;
const Util = imports.misc.util;
const PopupMenu = imports.ui.popupMenu;
const PanelMenu = imports.ui.panelMenu;
const Mainloop = imports.mainloop;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Utils = Me.imports.utils;
const Opts = Me.imports.opts;

const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;

const INDICATOR_ICON	= 'mail-unread-symbolic'
const INACTIVE_ITEM		= { reactive: true, can_focus: false, activate: false, hover: false };
 
var IndicatorMailMenuItem = GObject.registerClass(
class IndicatorMailMenuItem extends PopupMenu.PopupBaseMenuItem {
	_init(mail, avatars, avatarSize, showDates, extension) {
		super._init(INACTIVE_ITEM);
		
		this._extension = extension;
		this._mailID = null;
		this._dateLabel = null;
		this._iconBin = null;
		this._closeButton = null;
		
		let [sender, ]		= mail['sender_name'].get_string();
		let [senderAddr, ]	= mail['sender_addr'].get_string();
		let [subject, ]		= mail['subject'].get_string();
		let [mailID, ]		= mail['id'].get_string();
		let datetime		= mail['datetime'].get_int32();
		
		this._mailID = mailID;
		
		if (sender.length == 0) sender = senderAddr;
		
		let hbox = new St.BoxLayout({ vertical: false, x_expand: true, 
									  reactive: true, can_focus: true, track_hover: true,
									  style_class: 'menu-item-box'});
		
		let vbox = new St.BoxLayout({ vertical: true, x_expand: true });
		let senderLabel = new St.Label({ text: sender, x_expand: true, style_class: 'sender-label' });
		let subjectLabel = new St.Label({ text: subject, x_expand: true, style_class: 'subject-label' });
		
		/* TODO : somehow these linewrap settings are ignored... */
		senderLabel.clutter_text.line_wrap = false;
		senderLabel.clutter_text.ellipsize = Pango.EllipsizeMode.END;
		subjectLabel.clutter_text.line_wrap = false;
		subjectLabel.clutter_text.ellipsize = Pango.EllipsizeMode.END;
		
		let hbox2 = new St.BoxLayout({ vertical: false, x_expand: true, style_class: 'generic-box' });
		
		hbox2.add(senderLabel);
		
		if (showDates) {
			this._dateLabel = new St.Label({ text: Util.formatTime(new Date(datetime * 1000)), style_class: 'mailnag-date-label', 
											 y_expand: true, x_expand: false, x_align: Clutter.ActorAlign.END });
			hbox2.add(this._dateLabel);
		}
		
		this._closeButton = new St.Button({ reactive: true, can_focus: true, visible: false, track_hover: true });
		
		this._closeButton.connect('clicked', () => {
			extension.markMailAsRead(mailID);
		});
		
		this._closeButton.child = new St.Icon({ icon_name: 'window-close-symbolic', 
								style_class: 'popup-menu-icon' });
		
		hbox2.add(this._closeButton);
		
		vbox.add(hbox2);
		vbox.add(subjectLabel);
		
		hbox.add(vbox);
		
		let avatarFile = avatars[senderAddr.toString().toLowerCase()];
		if (avatarFile != undefined) {
			this._iconBin = new St.Bin({ style_class: 'avatar',
								   style: 'background-image: url("%s")'.format(avatarFile),
								   width: avatarSize, height: avatarSize,
								   x_expand: true,
								   y_expand: true });
			hbox.add(this._iconBin);
		} else {
			/*hbox.add(new St.Icon({ icon_name: 'avatar-default', 
											  icon_size: avatarSize }));*/
		}

		hbox.connect('button-release-event', this._onButtonReleaseEvent.bind(this));
		hbox.connect('touch-event', this._onTouchEvent.bind(this));
		hbox.connect('key-press-event', this._onKeyPressEvent.bind(this));
		hbox.connect('notify::hover', this._onHover.bind(this));
		
		hbox.isMailnagMailItem = true;
		
		this.add_child(hbox);
	}
	
	_onButtonReleaseEvent(actor, event) {
		Utils.openDefaultMailReader();
		this.activate(event);
		return Clutter.EVENT_STOP;
	}

	_onTouchEvent(actor, event) {
		if (event.type() == Clutter.EventType.TOUCH_END) {
			Utils.openDefaultMailReader();
			this.activate(event);
			return Clutter.EVENT_STOP;
		}
		return Clutter.EVENT_PROPAGATE;
	}

	_onKeyPressEvent(actor, event) {
		let symbol = event.get_key_symbol();

		if (symbol == Clutter.KEY_space || symbol == Clutter.KEY_Return) {
			Utils.openDefaultMailReader();
			this.activate(event);
			return Clutter.EVENT_STOP;
		} else if (symbol == Clutter.KEY_Delete) {
			this._extension.markMailAsRead(this._mailID);
			return Clutter.EVENT_STOP;
		}
		return Clutter.EVENT_PROPAGATE;
	}
	
	_onHover(actor) {
		if (this._dateLabel != null)
			this._dateLabel.visible = !actor.hover;
		
		if (this._iconBin != null)
			this._iconBin.visible = !actor.hover;
		
		this._closeButton.visible = actor.hover;
	}
});

var MailnagIndicator = GObject.registerClass(
class MailnagIndicator extends PanelMenu.Button {
	_init(options, extension) {
		super._init(0.0, null, false);
		
		this._opts = options;
		this._extension = extension;
		
		this._icon = new St.Icon({
			icon_name: INDICATOR_ICON,
			style_class: 'system-status-icon'});

		this._iconBin = new St.Bin({ child: this._icon, x_expand: false, y_expand: false });
		
		this._counterLabel = new St.Label({ text: "0",
											x_align: Clutter.ActorAlign.CENTER,
											x_expand: true,
											y_align: Clutter.ActorAlign.CENTER,
											y_expand: true });
		
		this._counterBin = new St.Bin({ style_class: 'mailnag-counter',
										child: this._counterLabel,
										layout_manager: new Clutter.BinLayout() });
	
		this.add_actor(this._iconBin);
		this.add_actor(this._counterBin);
		
		this.setMails([]);
	}
	
	vfunc_allocate(box) {
		super.vfunc_allocate(box);
		
		// the iconBin should fill our entire box
		this._iconBin.allocate(box);

		// get the allocation box of the indicator icon
		let iconBox = this._iconBin.child.first_child.get_allocation_box();
		// create a temporary box for calculating the counter allocation
		let childBox = new Clutter.ActorBox();

		let [minWidth, minHeight, naturalWidth, naturalHeight] = this._counterBin.get_preferred_size();
		let direction = this.get_text_direction();

		// WORKAROUND: somehow the horizontal allocation 
		// of the counter bin is 4px off in GNOME 40.
		const OFFSET = 4;
		
		if (direction == Clutter.TextDirection.LTR) {
			// allocate on the right in LTR
			childBox.x1 = iconBox.x2 - (naturalWidth / 2) + OFFSET;
			childBox.x2 = childBox.x1 + naturalWidth;
		} else {
			// allocate on the left in RTL
			childBox.x1 = iconBox.x1 - (naturalWidth / 2) + OFFSET;
			childBox.x2 = childBox.x1 + naturalWidth;
		}

		childBox.y1 = iconBox.y2 - (naturalHeight / 2) - 1;
		childBox.y2 = childBox.y1 + naturalHeight;

		this._counterBin.allocate(childBox);
    }
    
	_updateMenu(mails) {
		let item = null;
		this.menu.removeAll();
		
		if (mails.length > 0) {
			let maxMails = (mails.length <= this._opts.maxVisibleMails) ? 
							mails.length : this._opts.maxVisibleMails;
							
			if (this._opts.groupMailsByAccount && (mails[0]['account_name'] != undefined)) {
				this._addGroupedMailItems(this.menu, mails, maxMails);
			} else {
				this._addMailItems(this.menu, mails, maxMails);
				
				if (mails.length > this._opts.maxVisibleMails) {
					let str = _("(and {0} more)").replace("{0}", (mails.length - this._opts.maxVisibleMails));
					item = new PopupMenu.PopupBaseMenuItem(INACTIVE_ITEM);
					item.actor.add_child(new St.Label({ text: str, style_class: 'more-label' }));

					this.menu.addMenuItem(item);
				}
			}		

			if (this._opts.menuActions != Opts.ACTION_FLAGS.NONE)
				this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem())
			
			if (this._opts.menuActions & Opts.ACTION_FLAGS.MARK_ALL_AS_READ) {
				item = new PopupMenu.PopupMenuItem(_("Mark All As Read"));
				item.connect('activate', () => {
					// We call markAllMailsAsRead() on the mainloop (deferred) 
					// because it will cause the menu to be rebuilt
					// (the 'activate' event is closing the menu and 
					// rebuilding it while it is being closed, somehow 
					// reopens the menu).
					Mainloop.idle_add(() => {
						this._extension.markAllMailsAsRead();
						return false;
					});
				});
				this.menu.addMenuItem(item);
			}
		}
		
		if (this._opts.menuActions & Opts.ACTION_FLAGS.CHECK_FOR_MAIL) {
			item = new PopupMenu.PopupMenuItem(_("Check For Mail"));
			item.connect('activate', () => {
				this._extension.checkForMails();
			});
			this.menu.addMenuItem(item);
		}
		
		if (this._opts.menuActions & Opts.ACTION_FLAGS.SETTINGS)
			this._addSettingsSubmenu(this.menu);
			
		if (this._opts.menuActions & Opts.ACTION_FLAGS.QUIT) {
			item = new PopupMenu.PopupMenuItem(_("Quit"));
			item.connect('activate', () => {
				item.actor.reactive = false;
				this._extension.shutdown();
			});
			this.menu.addMenuItem(item);
		}
		
		if (this.menu.isOpen) {
			if (mails.length == 0) {
				// It the menu is open and the last mail was removed by the user,
				// close the menu.
				this.menu.close();
			} else {
				// Fix hover effect of the focused mail menu-item after menu rebuild
				let [x, y] = global.get_pointer();
				let actor = global.stage.get_actor_at_pos(Clutter.PickMode.REACTIVE, x, y);
				if ((actor != null) && (actor.isMailnagMailItem)) {
					actor.hover = true;
				}
		
				// If the menu is open, set the key-focus on the panel icon
				// so the focus won't get lost if a mail was removed via the delete key.
				this.grab_key_focus();
			}
		}
	}
	
	_addMailItems(menu, mails, maxMails) {
		for (let i = 0; i < maxMails; i++) {
			let item = new IndicatorMailMenuItem(mails[i], this._opts.avatars, 
				this._opts.avatarSize, this._opts.showDates, this._extension);

			menu.addMenuItem(item);
		}
	}
	
	_addGroupedMailItems(menu, mails, maxMails) {
		//
		// Group mails by account
		//
		let groups = new Map();
		
		for (let m of mails) {
			let [name, size] = m['account_name'].get_string();
			
			if (!groups.has(name))
				groups.set(name, [])
			
			groups.get(name).push(m);
		}		
		
		//
		// Trim mails of groups
		//
		let groupsTrimmed = new Map();
		let counter = maxMails;
		
		counter = Math.min(counter, mails.length);
		// Make sure all accounts are shown (i.e. at least one mail per account).
		counter = Math.max(counter, groups.size);
		
		while (counter > 0) {
			for (let [k, v] of groups) {
				if (v.length > 0) {
					if (!groupsTrimmed.has(k))
						groupsTrimmed.set(k, [])
					
					let m = v.shift();
					groupsTrimmed.get(k).push(m);
					counter--;
					
					if (counter == 0)
						break;
				}
			}
		}
		
		//
		// Add groups to the menu
		//
		let keys = [...groupsTrimmed.keys()].sort();

		for (let k of keys) {
			let item = new PopupMenu.PopupBaseMenuItem(INACTIVE_ITEM);
			let label = new St.Label({ text: k, style_class: 'account-group-label' });
			let mails = groupsTrimmed.get(k);
			let remainingMails = groups.get(k);
			
			label.clutter_text.line_wrap = false;
			label.clutter_text.ellipsize = Pango.EllipsizeMode.END;
		
			if (remainingMails.length > 0) {
				let hbox = new St.BoxLayout({ vertical: false, x_expand: true, style_class: 'generic-box' });
				let str = "%d/%d".format(mails.length, mails.length + remainingMails.length);
				let bin = new St.Bin({ style_class: 'overflow-badge', child: new St.Label( { text: str } ), 
									   y_expand: true, x_expand: false, x_align: Clutter.ActorAlign.END });
				
				hbox.add(label);
				hbox.add(bin);
				item.actor.add_child(hbox);
			} else {
				item.actor.add_child(label);
			}
		
			menu.addMenuItem(item);
			this._addMailItems(menu, mails, mails.length);
		}
	}
	
	_addSettingsSubmenu(menu) {
		let item = null;
		let subMenu = new PopupMenu.PopupSubMenuMenuItem(_("Settings"), false);
		item = new PopupMenu.PopupMenuItem(_("Mailnag Settings"));
		item.connect('activate', () => {
			Utils.launchApp('mailnag-config.desktop');
		});
		
		subMenu.menu.addMenuItem(item);
		
		item = new PopupMenu.PopupMenuItem(_("Extension Settings"));
		item.connect('activate', () => {
			Util.spawn(['gnome-shell-extension-prefs', 'mailnag@pulb.github.com']);
		});
						
		subMenu.menu.addMenuItem(item);
		
		menu.addMenuItem(subMenu);
	}
	
	setMails(mails) {
		let label = mails.length <= 99 ? mails.length.toString() : "...";
		this._counterLabel.set_text(label);

		if (mails.length > 0) {
			this._counterBin.visible = true;
			this._icon.opacity = 255;
		} else {
			this._counterBin.visible = false;
			this._icon.opacity = 130;
		}

		this._updateMenu(mails);
	}
});
