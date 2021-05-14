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

$(PROGRAMS): $(FILES)
	$(CC) --pkg $(LIBS) $(FILES)


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
	
	test -d $(prefix)/$(DATADIR)/schemas || mkdir --parents ~/.local/$(DATADIR)/schemas
	for d in $(SCHEMAS); do \
		install -m 0644 $$d ~/.local/$(DATADIR)/schemas; \
	done
	
	glib-compile-schemas ~/.local/$(DATADIR)/schemas


.PHONY: clean
clean:
	rm -f $(PROGRAMS)

