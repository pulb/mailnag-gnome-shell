CC = valac
LIBS = folks
UUID = mailnag@zulu99-gmx.net
FILES = aggregate-avatars.vala
DATA = extension.js indicator.js source.js stylesheet.css metadata.json
DATADIR = share/gnome-shell/extensions/$(UUID)
PROGRAMS = aggregate-avatars

prefix = /usr

$(PROGRAMS): $(FILES)
	$(CC) --pkg $(LIBS) $(FILES)

.PHONY: install
install: $(PROGRAMS) $(DATA)
	test -d $(prefix)/bin || mkdir --parents $(prefix)/bin
	for p in $(PROGRAMS); do \
		install -m 0755 $$p $(prefix)/bin; \
	done
	
	test -d $(prefix)/$(DATADIR) || mkdir --parents $(prefix)/$(DATADIR)
	for d in $(DATA); do \
		install -m 0644 $$d $(prefix)/$(DATADIR); \
	done

.PHONY: clean
clean:
	rm -f $(PROGRAMS)

