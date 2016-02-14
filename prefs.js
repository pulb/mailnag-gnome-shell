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

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;

const Gettext = imports.gettext.domain('mailnag-gnome-shell');
const _ = Gettext.gettext;

const MAX_VISIBLE_MAILS_LIMIT	= 20;


const MailnagSettingsWidget = new GObject.Class({
	Name: 'Mailnag.Prefs.MailnagSettingsWidget',
	GTypeName: 'MailnagSettingsWidget',
	Extends: Gtk.Box,


	_init : function(params) {
		this.parent(params);
		this.orientation = Gtk.Orientation.VERTICAL;
		this.margin = 12;
		this.spacing = 6;
		
		let settings = Convenience.getSettings();
		
		let box = new Gtk.Box( { orientation: Gtk.Orientation.HORIZONTAL, spacing: 6 } );
		box.add(new Gtk.Label( { label: _('Maximum number of visible mails:') } ));
		
		let spinbtn = Gtk.SpinButton.new_with_range(1, MAX_VISIBLE_MAILS_LIMIT, 1);
		spinbtn.set_value(settings.get_int('max-visible-mails'));
		settings.bind('max-visible-mails', spinbtn, 'value', Gio.SettingsBindFlags.DEFAULT);
		
		box.add(spinbtn);
		this.add(box);
		
		let checkbtn_avatars = new Gtk.CheckButton( { label: _("Show Avatars") } );
		settings.bind('show-avatars', checkbtn_avatars, 'active', Gio.SettingsBindFlags.DEFAULT);
		
		this.add(checkbtn_avatars);
		
		let checkbtn_remove = new Gtk.CheckButton( { label: _("Remove indicator icon if maillist is empty") } );
		settings.bind('remove-indicator', checkbtn_remove, 'active', Gio.SettingsBindFlags.DEFAULT);
		
		this.add(checkbtn_remove);
	}
});


function init() {
	Convenience.initTranslations();
}


function buildPrefsWidget() {
	let widget = new MailnagSettingsWidget();
	widget.show_all();
	
	return widget;
}
