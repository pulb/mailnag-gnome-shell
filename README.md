# mailnag-gnome-shell
Mailnag GNOME-Shell extension.

#### Features
* Notifies about new mails via the messaging tray (including a counter badge).
* Shows an indicator in the top panel (including counter badge and popup menu).

#### Installation
This extension requires the Mailnag daemon from the [mailnag-next](https://github.com/pulb/mailnag/tree/mailnag-next) branch.  
Prior to installation, run `mailnag-config` and ensure that the *libnotify* plugin is disabled.

###### Requirements
* vala (at compiletime only)
* libfolks
* mailnag

To install the extension type the following commands in a terminal (root is *not* required):

	unzip mailnag-gnome-shell-master.zip
	cd mailnag-gnome-shell-master
	make install-local

That's it. Now fire up `gnome-tweak-tool` and enable the extension.  

#### Screenshots
![Screenshot](https://raw.github.com/pulb/mailnag-gnome-shell/docs/docs/screenshots/mailnag-gnome-shell.png)
