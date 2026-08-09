# Chrome Web Store listing copy

Paste-ready text for the Developer Dashboard. Keep this in sync with the
manifest when either changes.

## Title (dashboard reads it from manifest `name`)

```
Fokus - Hide YouTube Shorts & Feed
```

34 characters. The store truncates around 35 in search results, so everything
here survives. Title keywords carry more ranking weight than description
keywords, which is why the searched terms sit in it rather than a slogan.

## Summary (manifest `description`, max 132)

```
Hide YouTube Shorts, the homepage feed, recommendations, comments and more. 23 toggles, every one reversible in a click.
```

## Detailed description (dashboard only)

```
Fokus hides the parts of YouTube that pull you off track, and puts any of them
back the moment you change your mind.

Most cleanup extensions are all or nothing. This one is 23 independent
switches. Kill the homepage feed but keep your subscriptions. Remove Shorts and
leave comments alone. Strip the sidebar while you study, restore it that
evening. Nothing is permanent and nothing needs a page reload: flip a switch
and the change lands instantly in every open tab.

WHAT YOU CAN HIDE

Feed and navigation
- Homepage feed
- Shorts, including every shelf and the sidebar link
- Explore and Trending
- More from YouTube
- Subscriptions, with an optional redirect

Watch page
- The whole video sidebar, or just recommended videos, live chat or the playlist panel
- Video info, or just the like and share buttons, the channel row or the description
- Comments
- Mix and radio playlists
- Merch, tickets and offers

Player
- End screen videowall
- End screen cards
- Autoplay
- Annotations

Header and search
- Top header, or just the notification bell
- Irrelevant search results such as "People also search for" and "Latest from"

BUILT TO BE REVERSIBLE

Nothing is deleted. Every switch is a style rule that stops applying the second
you turn it off, so the page returns exactly as it was. Turn the extension off
entirely with the pause button and the site is untouched.

PRIVATE BY DESIGN

No account, no sign up, no tracking, no analytics. Fokus makes no network
requests to any server, including mine. The only thing it stores is which
switches you turned on, and those ride your own Chrome profile.

OPEN SOURCE

Every line is public at github.com/happymooguild/fokus. Read it, audit it,
fork it.

Fokus is an independent project. It is not affiliated with, endorsed by, or
sponsored by YouTube or Google.
```

## Why it is shaped this way

- Opens with a concise statement of what the item does, which the listing
  requirements ask for explicitly.
- No unattributed testimonials, which the spam policy prohibits outright.
- Keyword repetition stays under the policy's guidance of roughly five
  instances per term, and no more than five external brands are named.
- The reversibility and privacy sections exist because they are the two things
  a reader weighs before installing something that rewrites a site they use
  daily.


## Privacy tab answers

### Single purpose

```
Fokus lets a user hide distracting parts of the YouTube website, such as the homepage feed, Shorts, recommended videos and comments. Each element has its own on/off switch in the extension popup, and turning a switch off restores that element immediately.
```

### storage justification

```
The storage permission holds the user's own switch settings and nothing else: which of the 23 interface elements they have chosen to hide, and whether the extension is currently paused. These are booleans keyed by element name, and they are the extension's entire state.

They are written when the user flips a switch in the popup, and read by the content script to decide which CSS rules to apply to a YouTube page. chrome.storage.sync is used rather than local so the user's choices follow their Chrome profile across devices, which is the behaviour people expect from a settings panel.

No personal data, browsing history, page content or identifiers are stored. Nothing is transmitted anywhere. Without this permission the extension could not remember a single choice and every switch would reset on each page load.
```

### Host permission justification (*://*.youtube.com/*)

```
Fokus exists solely to modify the YouTube interface, so it requests access to youtube.com and to no other site.

The permission injects one stylesheet and one content script into YouTube pages. The stylesheet holds every hiding rule, each gated behind an attribute on the page's html element. The content script keeps that attribute in sync with the user's saved switches, and handles the cases CSS cannot express: identifying the Explore and More from YouTube sidebar sections by where their links point, redirecting a /shorts/ URL to the normal watch page when Shorts are hidden, and switching autoplay off once per page.

No page content is read for any purpose other than deciding what to hide, no data leaves the browser, and the extension makes no network requests. activeTab would not work, because the rules must apply automatically on every YouTube page the user opens, not only after a toolbar click.
```

### Are you using remote code?

```
No.

All code is contained in the uploaded package. The extension loads no external scripts, uses no eval or new Function, and makes no network requests of any kind. The only external URLs it contains are the GitHub repository link in homepage_url and the sponsor link in the popup footer. Both are ordinary hyperlinks the user may choose to click; neither is fetched or executed.
```

Verified against the shipped package: no fetch, XMLHttpRequest, eval, new
Function, importScripts, WebSocket, sendBeacon or @import anywhere, and every
popup resource is a local file.

### What user data do you plan to collect?

```
None.

Fokus collects no user data of any category: no personally identifiable information, health, financial or authentication information, no personal communications, location, web history, or user activity, and no website content.

The extension reads the DOM of a YouTube page only to decide which elements to hide, entirely on the user's own machine. Nothing derived from it is stored, sent or shared. The single thing written to disk is the user's own set of on/off switches, held in chrome.storage.sync.

There are no analytics, no telemetry, no error reporting, no accounts and no servers. The extension makes no network requests, so there is no channel through which data could leave the browser.
```

Tick no data categories. All three certifications at the foot of the tab can be
accepted: the extension does not sell or transfer user data, does not use it for
anything unrelated to its single purpose, and does not use it for creditworthiness
or lending.
