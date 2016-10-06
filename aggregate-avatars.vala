/* Mailnag - GNOME-Shell extension frontend
*
* Copyright 2013, 2016 Patrick Ulbrich <zulu99@gmx.net>
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

static int main(string args[])
{
	MainLoop mainloop = new MainLoop();
	var aggregator = IndividualAggregator.dup();

	aggregator.prepare.begin();

	Idle.add(() => {
		if (!aggregator.is_quiescent)
			return true;

		aggregate_async.begin(mainloop, aggregator);
		return false;
	});

	mainloop.run();
	return 0;
}

async void aggregate_async(MainLoop mainloop, IndividualAggregator aggregator)
{
	File cache_dir = File.new_for_path(
						Environment.get_user_runtime_dir()).get_child("aggregate-avatars-cache");

	if (!cache_dir.query_exists())
		cache_dir.make_directory_with_parents();

	var sb = new StringBuilder();
	
	foreach (var e in aggregator.individuals.entries)
	{		
		OutputStream dst_stream = null;
		InputStream src_stream = null;

		try
		{
			Individual individual = e.value;
			File dst_file = cache_dir.get_child(individual.id);

			if (dst_file.query_exists())
				dst_file.delete();

			if ((individual.avatar != null) && !individual.email_addresses.is_empty)
			{
				src_stream = individual.avatar.load(-1, null, null);
				dst_stream = dst_file.replace(null, false, FileCreateFlags.PRIVATE);
				dst_stream.splice(src_stream, OutputStreamSpliceFlags.NONE);

				foreach (var email in individual.email_addresses)
					sb.append_printf("%s;%s;", email.value.strip(), dst_file.get_path());
			}
		}
		catch (Error e)
		{
				stderr.printf("Error: %s\n", e.message);
		}
		finally
		{
			try
			{
				if (src_stream != null) src_stream.close();
				if (dst_stream != null)	dst_stream.close();
			} catch (IOError e) {}
		}
	}

	if (sb.len > 0)
	{
		stdout.printf(sb.truncate(sb.len - 1).str);
		stdout.flush();
	}

	mainloop.quit();
}
