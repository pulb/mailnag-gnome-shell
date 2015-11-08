# mailnag-gnome-shell
GNOME-Shell extension that shows a mail indicator in the top panel (including mail counter and popup menu).

## Installation
This extension requires the [Mailnag daemon](https://github.com/pulb/mailnag).  
Prior to installation, run `mailnag-config`.  
If you want notification popups ensure that the *libnotify* plugin is enabled.

### Ubuntu
This extension is available in the official [Ubuntu PPA](https://launchpad.net/~pulb/+archive/mailnag).  
Issue the following commands in a terminal to enable the PPA and install the extension.  

    sudo add-apt-repository ppa:pulb/mailnag
    sudo apt-get update
    sudo apt-get install gnome-shell-mailnag

As of Ubuntu 14.10 (Utopic), this extension is also available in the official repos.  
Run `sudo apt-get install gnome-shell-mailnag` in a terminal to install it.

### Debian
This extension is currently available in Debian unstable.  
Run `sudo apt-get install gnome-shell-mailnag` in a terminal to install it.

### Arch Linux
This extension is available in the [AUR](https://aur.archlinux.org/packages/mailnag-gnome-shell/) repository.  
Please either run `yaourt -S mailnag-gnome-shell` or `packer -S mailnag-gnome-shell` (as root) to install the package.

### Other GNOME 3 Distros
This extension is also available for easy 1-click installation at [extensions.gnome.org](https://extensions.gnome.org/extension/886/mailnag/).  
Please note that this version does not support avatars (as shown in the screenshot below).

### Generic Source Tarballs
Distribution independent tarball releases are available [here](https://github.com/pulb/mailnag-gnome-shell/releases).  
To install the extension type the following commands in a terminal (root is *not* required):

	tar xvf mailnag-gnome-shell-*.tar.gz
	cd mailnag-gnome-shell-*
	make install-local

That's it. Now fire up `gnome-tweak-tool` and enable the extension.  

###### Requirements
* vala (at compiletime only)
* libfolks
* gnome-shell
* mailnag

## Screenshots
![Screenshot](https://raw.github.com/pulb/mailnag-gnome-shell/docs/docs/screenshots/mailnag-gnome-shell.png)
