/* Mailnag - GNOME-Shell extension frontend
*
* Copyright 2013 - 2021 Patrick Ulbrich <zulu99@gmx.net>
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

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;

const MAX_VISIBLE_MAILS_LIMIT = 20;


var MailnagSettingsWidget = GObject.registerClass(
class MailnagSettingsWidget extends Gtk.Box {

	_init() {
		super._init( {	orientation: Gtk.Orientation.VERTICAL, 
						spacing: 6, 
						margin_start: 12, margin_end: 12, margin_top: 12, margin_bottom: 12 } );
		
		let settings = Convenience.getSettings();
		
		let box = new Gtk.Box( { orientation: Gtk.Orientation.HORIZONTAL, spacing: 6 } );
		box.append(new Gtk.Label( { label: _('Maximum number of visible mails:') } ));
		
		let spinbtn = Gtk.SpinButton.new_with_range(1, MAX_VISIBLE_MAILS_LIMIT, 1);
		spinbtn.set_value(settings.get_int('max-visible-mails'));
		settings.bind('max-visible-mails', spinbtn, 'value', Gio.SettingsBindFlags.DEFAULT);
		
		box.append(spinbtn);
		this.append(box);
		
		let checkbtn_remove = new Gtk.CheckButton( { label: _('Remove indicator icon if maillist is empty') } );
		settings.bind('remove-indicator', checkbtn_remove, 'active', Gio.SettingsBindFlags.DEFAULT);
		this.append(checkbtn_remove);
		
		let checkbtn_group = new Gtk.CheckButton( { label: _('Group mails by account') } );
		settings.bind('group-by-account', checkbtn_group, 'active', Gio.SettingsBindFlags.DEFAULT);
		this.append(checkbtn_group);
		
		let checkbtn_avatars = new Gtk.CheckButton( { label: _('Show avatars') } );
		settings.bind('show-avatars', checkbtn_avatars, 'active', Gio.SettingsBindFlags.DEFAULT);
		this.append(checkbtn_avatars);
		
		let checkbtn_dates = new Gtk.CheckButton( { label: _('Show dates') } );
		settings.bind('show-dates', checkbtn_dates, 'active', Gio.SettingsBindFlags.DEFAULT);
		this.append(checkbtn_dates);
		
		let checkbtn_mark = new Gtk.CheckButton( { label: _('Show Mark-All-As-Read button') } );
		settings.bind('show-mark-all-as-read-button', checkbtn_mark, 'active', Gio.SettingsBindFlags.DEFAULT);
		this.append(checkbtn_mark);
		
		let checkbtn_check = new Gtk.CheckButton( { label: _('Show Check-For-Mail button') } );
		settings.bind('show-check-for-mail-button', checkbtn_check, 'active', Gio.SettingsBindFlags.DEFAULT);
		this.append(checkbtn_check);
		
		let checkbtn_settings = new Gtk.CheckButton( { label: _('Show Settings button') } );
		settings.bind('show-settings-button', checkbtn_settings, 'active', Gio.SettingsBindFlags.DEFAULT);
		this.append(checkbtn_settings);
		
		let checkbtn_quit = new Gtk.CheckButton( { label: _('Show Quit button') } );
		settings.bind('show-quit-button', checkbtn_quit, 'active', Gio.SettingsBindFlags.DEFAULT);
		this.append(checkbtn_quit);
	}
});


function init() {
	Convenience.initTranslations();
}


function buildPrefsWidget() {
	let widget = new MailnagSettingsWidget();
	return widget;
}
