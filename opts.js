/* Mailnag - GNOME-Shell extension frontend
*
* Copyright 2016, 2019 Patrick Ulbrich <zulu99@gmx.net>
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

const ACTION_FLAGS = {
	NONE				: 0,
	MARK_ALL_AS_READ	: 1,
	CHECK_FOR_MAIL		: 2,
	SETTINGS			: 4,
	QUIT				: 8,
	ALL					: 15
};

var Options = class {
	constructor() {	
		this.maxVisibleMails 		= 10;
		this.showDates				= true;
		this.groupMailsByAccount	= false;
		this.removeIndicator		= true;
		this.avatars				= {};
		this.avatarSize				= 38;
		this.menuActions			= ACTION_FLAGS.ALL;
	}
};
