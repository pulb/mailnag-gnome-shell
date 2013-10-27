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
const MessageTray = imports.ui.messageTray;
const Lang = imports.lang;

const SOURCE_ICON = 'mail-unread';

const MailnagSource = new Lang.Class({
	Name: 'MailnagSource',
	Extends: MessageTray.Source,

	_init: function(maxVisibleMails) {
		this._count = 0;
		this._maxVisisbleMails = maxVisibleMails;
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
		let maxMails = (mails.length <= this._maxVisisbleMails) ? 
							mails.length : this._maxVisisbleMails;
							
		this._count = mails.length;
		
		for (let i = 0; i < maxMails; i++) {
			let sender = mails[i]['sender_name'].get_string()[0];
			if (sender.length == 0) sender = mails[i]['sender_addr'].get_string()[0];
			body += sender + ":\n<i>" + mails[i]['subject'].get_string()[0] + "</i>\n\n";
		}
		
		if (mails.length > this._maxVisisbleMails) {
			body += "<i>" + _("(and {0} more)").replace("{0}", (mails.length - this._maxVisisbleMails)) + "</i>";
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
