# Friends Street prototype (claude.ai version)

> The main version now runs on this project's own server with **no accounts needed**: see the main README. This file is the earlier claude.ai artifact version, kept for reference.

A clickable trial version of the scrolling pixel street, built to find out whether people like the idea. It's one HTML file, published as a claude.ai artifact so it can be shared as a link without hosting anything.

What it does:

- One long street. Each friend lives in their own building, with a room showing what they're up to and a dialogue box with their answer.
- **Daily question:** "What are you up to?" pops up when you haven't answered today. You pick what your room looks like (cooking, working, reading, music, plants, workout, baking, art, chilling, sleeping, out & about).
- **Your character:** pick skin, hair color, hair style and top.
- **Local time:** each building shows the friend's local time, and their window shows day, dusk or night for where they are.
- **Gifts:** send flowers, chocolates or a "how are you?" with a note. The receiver watches the sender walk down the street to their house, then can write back. The sender sees the reply.
- **Drive:** your car cruises down the street, past bakeries, cafes and shops, and parks at each friend's place. "Say hi" opens their house.
- **Sky:** follows your local time (day, sunset, night), or pick rain or blossom.
- **Demo street:** with sample friends, for anyone who can't join the live street. Add `#demo` to the link to see it.

How sharing works (from the claude.ai artifact docs, worth double-checking in the Share menu):

- On a personal plan, only the owner plus friends invited **by email as Editors** can move in and post. That only works while the artifact is not also shared by public link.
- Friends need a claude.ai account to move in. Anyone who opens it without access sees the demo street.
- Gifts are only *shown* to the person receiving them, but anyone with access to the street could technically read them. Fine for a trial with friends, not for anything private.

The page's shared data uses these access rules: everyone with access reads; each person writes only their own house (`people/<their id>`); only the owner and editors rename the street (`meta`); anyone who can post can send gifts (`gifts`).
