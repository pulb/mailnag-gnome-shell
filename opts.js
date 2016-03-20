/* Mailnag - GNOME-Shell extension frontend
*
* Copyright 2016 Patrick Ulbrich <zulu99@gmx.net>
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

const Lang = imports.lang;

const ACTION_FLAGS = {
	NONE				: 0,
	MARK_ALL_AS_READ	: 1,
	CHECK_FOR_MAIL		: 2,
	SETTINGS			: 4,
	ALL					: 7
};

const Options = new Lang.Class({
	Name: 'Options',
	
	maxVisibleMails 	: 10,
	showDates			: true,
	groupMailsByAccount	: false,
	removeIndicator		: true,
	avatars				: {},
	avatarSize			: 38,
	menuActions			: ACTION_FLAGS.ALL
});
