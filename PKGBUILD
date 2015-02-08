# Maintainer: Patrick Ulbrich <zulu99 at gmx . net>

pkgname=mailnag-gnome-shell
pkgver=3.14.1
pkgrel=2
pkgdesc="Mailnag GNOME-Shell extension"
arch=('i686' 'x86_64' 'armv6h' 'armv7h')
url="https://github.com/pulb/mailnag-gnome-shell"
license=('GPL')
depends=('gnome-shell' 'mailnag>=0.9' 'folks')
makedepends=('vala')
source=('https://github.com/pulb/mailnag-gnome-shell/archive/v3.14.1.tar.gz')
md5sums=('ca4ca3dce2ec597893f1e8d51b70292e')
install='mailnag-gnome-shell.install'

build() {
	cd $pkgname-$pkgver
	make
}

package() {
	cd $pkgname-$pkgver
	make prefix="$pkgdir"/usr install
}
