# Maintainer: Patrick Ulbrich <zulu99 at gmx . net>

pkgname=mailnag-gnome-shell-extension
pkgver=3.12.1
pkgrel=1
pkgdesc="Mailnag GNOME-Shell extension."
arch=('any')
url="https://github.com/pulb/mailnag-gnome-shell"
license=('GPL')
depends=('mailnag >= 1.0.0', 'folks')
makedepends=('vala')
source=('')
md5sums=('')
install='mailnag.install'

build() {
	cd ${srcdir}/${pkgname}-${pkgver}
	make
}

package() {
 	make DESTDIR="$pkgdir" install
 	install -D -m644 LICENSE "${pkgdir}/usr/share/licenses/${pkgname}/LICENSE"
}
