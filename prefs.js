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

import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import Adw from 'gi://Adw';

import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';



const MAX_VISIBLE_MAILS_LIMIT = 20;


var MailnagSettingsWidget = GObject.registerClass(
	class MailnagSettingsWidget extends Adw.PreferencesPage {

		_init(extension) {

			super._init({
				title: _('Mailnag Extension'),
				icon_name: 'general-symbolic',
				name: 'Mailnag'
			});

			let behaviorGroup = new Adw.PreferencesGroup({
				title: _('General')
			});

			let settings = getSettings(extension);

			const settingsList = [
				{
				  key: 'max-visible-mails',
				  label: _('Maximum number of visible mails:'),
				  type: 'spin',
				},
				{
				  key: 'remove-indicator',
				  label: _('Remove indicator icon if maillist is empty'),
				  type: 'check',
				},
				{
				  key: 'group-by-account',
				  label: _('Group mails by account'),
				  type: 'check',
				},
				{
				  key: 'show-avatars',
				  label: _('Show avatars'),
				  type: 'check',
				},
				{
				  key: 'show-dates',
				  label: _('Show dates'),
				  type: 'check',
				},
				{
				  key: 'show-mark-all-as-read-button',
				  label: _('Show Mark-All-As-Read button'),
				  type: 'check',
				},
				{
				  key: 'show-check-for-mail-button',
				  label: _('Show Check-For-Mail button'),
				  type: 'check',
				},
				{
				  key: 'show-settings-button',
				  label: _('Show Settings button'),
				  type: 'check',
				},
				{
				  key: 'show-quit-button',
				  label: _('Show Quit button'),
				  type: 'check',
				},
			];

			for (const setting of settingsList) {
				let widget;
				if (setting.type === 'spin') {
					widget = new Adw.SpinRow({
						title: _(setting.label),
						adjustment: new Gtk.Adjustment({
							lower: 1,
							upper: MAX_VISIBLE_MAILS_LIMIT,
							step_increment: 1
						})
					});
					widget.set_value(settings.get_int(setting.key));
					settings.bind(setting.key, widget, 'value', Gio.SettingsBindFlags.DEFAULT);
				} else {
					widget = new Adw.SwitchRow({
						title: _(setting.label),
					});
					settings.bind(setting.key, widget, 'active', Gio.SettingsBindFlags.DEFAULT);

				}

				behaviorGroup.add(widget);
			}
			this.add(behaviorGroup)

		}
	});


export default class MailnagExtensionPreferences extends ExtensionPreferences {
	fillPreferencesWindow(window) {
		let widget = new MailnagSettingsWidget(this);

		window.add(widget);
	}
}

function getSettings(extension, schema) {
	schema = schema || extension.metadata['settings-schema'];
	const GioSSS = Gio.SettingsSchemaSource;

	// check if this extension was built with "make zip-file", and thus
	// has the schema files in a subfolder
	// otherwise assume that extension has been installed in the
	// same prefix as gnome-shell (and therefore schemas are available
	// in the standard folders)
	let schemaDir = extension.dir.get_child('schemas');
	let schemaSource;
	if (schemaDir.query_exists(null))
		schemaSource = GioSSS.new_from_directory(schemaDir.get_path(),
			GioSSS.get_default(),
			false);
	else
		schemaSource = GioSSS.get_default();

	let schemaObj = schemaSource.lookup(schema, true);
	if (!schemaObj)
		throw new Error('Schema ' + schema + ' could not be found for extension '
			+ extension.metadata.uuid + '. Please check your installation.');

	return new Gio.Settings({ settings_schema: schemaObj });
}