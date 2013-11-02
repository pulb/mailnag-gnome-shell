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

/* This tool aggregates a list of (email, avatar_file) pairs 
 * which is passed to the Mailnag GNOME-Shell extension. 
 * Compile with `valac --pkg folks aggregate-avatars.vala`. 
 */
 
using Folks;

MainLoop mainloop = null;

void main()
{
	mainloop = new MainLoop();

	var aggregator = IndividualAggregator.dup();
	aggregator.prepare();
	
	Idle.add(() => {
		if (!aggregator.is_quiescent)
			return true;
		
		var cache = AvatarCache.dup();
		var sb = new StringBuilder();
		
		foreach (var e in aggregator.individuals.entries)
		{
			foreach (var p in e.value.personas)
			{
				string avatar_uri = cache.build_uri_for_avatar(p.uid);
				File file = File.new_for_uri(avatar_uri);
				
				if (file.query_exists())
				{	
					foreach (var email in e.value.email_addresses)
						sb.append_printf("%s;%s;", email.value.strip(), file.get_path());
					
					break; /* exit personas loop */
				}
			}
		}
		
		stdout.printf(sb.truncate(sb.len - 1).str);
		stdout.flush();
		mainloop.quit();
		
		return false;
	});
	
	mainloop.run();
}
