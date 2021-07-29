CC = valac $(foreach w,$(CFLAGS) $(LDFLAGS),-X $(w))
LIBS = folks
UUID = mailnag@pulb.github.com
FILES = aggregate-avatars.vala
DATA = extension.js indicator.js utils.js convenience.js prefs.js opts.js stylesheet.css metadata.json
DATADIR = share/gnome-shell/extensions/$(UUID)
SCHEMAS = schemas/org.gnome.shell.extensions.mailnag.gschema.xml
SCHEMASDIR = share/glib-2.0/schemas
PROGRAMS = aggregate-avatars

prefix = /usr

all: $(PROGRAMS) compile_schemas build_locale

$(PROGRAMS): $(FILES)
	$(CC) --pkg $(LIBS) $(FILES)

compile_schemas:
	glib-compile-schemas schemas

# Localization
# ============
MSGSRC = $(wildcard po/*.po)
TOLOCALIZE = prefs.js indicator.js

potfile: $(TOLOCALIZE)
	mkdir -p po
	xgettext -k_ -kN_ -o po/mailnag-gnome-shell.pot --package-name "mailnag-gnome-shell" $(TOLOCALIZE)

mergepo: potfile
	for l in $(MSGSRC); do \
		msgmerge -U $$l ./po/mailnag-gnome-shell.pot; \
	done;

build_locale:
	for l in $(MSGSRC) ; do \
		lf=locale/`basename $$l .po`/LC_MESSAGES; \
		mkdir -p $$lf; \
		msgfmt -c $$l -o $$lf/mailnag-gnome-shell.mo; \
	done;

# ============ End localization

.PHONY: install
install: $(PROGRAMS) $(DATA) $(SCHEMAS)
	test -d $(prefix)/bin || mkdir --parents $(prefix)/bin
	for p in $(PROGRAMS); do \
		install -m 0755 $$p $(prefix)/bin; \
	done
	
	test -d $(prefix)/$(DATADIR) || mkdir --parents $(prefix)/$(DATADIR)
	for d in $(DATA); do \
		install -m 0644 $$d $(prefix)/$(DATADIR); \
	done
	
	test -d $(prefix)/$(SCHEMASDIR) || mkdir --parents $(prefix)/$(SCHEMASDIR)
	for d in $(SCHEMAS); do \
		install -m 0644 $$d $(prefix)/$(SCHEMASDIR); \
	done


install-local: $(PROGRAMS) $(DATA) $(SCHEMAS)
	test -d ~/.local/$(DATADIR) || mkdir --parents ~/.local/$(DATADIR)
	
	for p in $(PROGRAMS); do \
		install -m 0755 $$p ~/.local/$(DATADIR); \
	done
	
	for d in $(DATA); do \
		install -m 0644 $$d ~/.local/$(DATADIR); \
	done
	
	test -d ~/.local/$(DATADIR)/schemas || mkdir --parents ~/.local/$(DATADIR)/schemas
	for d in $(SCHEMAS); do \
		install -m 0644 $$d ~/.local/$(DATADIR)/schemas; \
	done
	
	cp -r locale ~/.local/$(DATADIR)

.PHONY: clean
clean:
	rm -f $(PROGRAMS)
	rm -f schemas/gschemas.compiled
	rm -rf locale

