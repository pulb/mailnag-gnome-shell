/* Mailnag - GNOME-Shell extension frontend
*
* Copyright 2014 Patrick Ulbrich <zulu99@gmx.net>
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
import Shell from 'gi://Shell';

export function launchApp(desktop_file) {
	let app = Shell.AppSystem.get_default()
		.lookup_app(desktop_file);
	if (app != null)
		app.activate();
}

export function openDefaultMailReader() {
	// Get default application for emails.
	let appInfo = Gio.AppInfo
		.get_default_for_type("x-scheme-handler/mailto", false);
	
	if (appInfo != null) {
		// Run default email application.
		launchApp(appInfo.get_id());
	}
}
