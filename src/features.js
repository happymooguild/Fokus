/**
 * Single source of truth for every toggle Fokus offers.
 *
 * Loaded as a plain script by both the popup and the content script, so it
 * declares one global and nothing else.
 *
 * Each feature:
 *   id       stable key used in storage and as the CSS token in [data-fokus~="id"]
 *   label    what the popup shows
 *   hint     one line explaining what disappears, shown under the label on hover
 *   children optional sub-toggles; the parent hides the whole container, each
 *            child hides one piece of it
 *   js       true when CSS alone can't do the job and content.js has to help
 */
globalThis.FOKUS = globalThis.FOKUS || {};

globalThis.FOKUS.GROUPS = [
  {
    id: 'feed',
    label: 'Feed & navigation',
    features: [
      {
        id: 'homepage_feed',
        label: 'Homepage feed',
        hint: 'The endless grid of recommendations on youtube.com'
      },
      {
        id: 'shorts',
        label: 'Shorts',
        hint: 'Shorts shelves, thumbnails and the sidebar link. Opening a Short sends you to the normal player.',
        js: true
      },
      {
        id: 'explore_trending',
        label: 'Explore & Trending',
        hint: 'The Explore section of the left sidebar (Trending, Music, Shopping…)',
        js: true
      },
      {
        id: 'more_from_youtube',
        label: 'More from YouTube',
        hint: 'Premium, Studio, Music and Kids links in the left sidebar',
        js: true
      },
      {
        id: 'subscriptions',
        label: 'Subscriptions',
        hint: 'Hides the Subscriptions link and redirects the page to your homepage',
        js: true
      }
    ]
  },
  {
    id: 'watch',
    label: 'Watch page',
    features: [
      {
        id: 'sidebar',
        label: 'Video sidebar',
        hint: 'The whole right-hand column next to the player',
        children: [
          {
            id: 'related',
            label: 'Recommended videos',
            hint: 'Up-next suggestions in the sidebar'
          },
          {
            id: 'live_chat',
            label: 'Live chat',
            hint: 'Chat panel on streams and premieres'
          },
          {
            id: 'playlist',
            label: 'Playlist panel',
            hint: 'The queue shown when a video is part of a playlist'
          }
        ]
      },
      {
        id: 'video_info',
        label: 'Video info',
        hint: 'Everything under the player except the title',
        children: [
          {
            id: 'buttons_bar',
            label: 'Buttons bar',
            hint: 'Like, dislike, share, save, download'
          },
          {
            id: 'channel',
            label: 'Channel row',
            hint: 'Avatar, channel name and the subscribe button'
          },
          {
            id: 'description',
            label: 'Description',
            hint: 'View count, date, links and chapters'
          }
        ]
      },
      {
        id: 'comments',
        label: 'Comments',
        hint: 'The entire comment section'
      },
      {
        id: 'mixes',
        label: 'Mix & radio playlists',
        hint: 'Auto-generated "Mix - <channel>" endless playlists'
      },
      {
        id: 'merch',
        label: 'Merch, tickets & offers',
        hint: 'Shelves selling products, event tickets and memberships'
      }
    ]
  },
  {
    id: 'player',
    label: 'Player',
    features: [
      {
        id: 'endscreen_videowall',
        label: 'End screen videowall',
        hint: 'The grid of thumbnails covering the video when it ends'
      },
      {
        id: 'endscreen_cards',
        label: 'End screen cards',
        hint: 'Suggestion cards and the ⓘ teaser floating over the video'
      },
      {
        id: 'autoplay',
        label: 'Autoplay',
        hint: 'Switches autoplay off once per page. Turn it back on in the player and this follows.',
        js: true,
        verb: 'Disable'
      },
      {
        id: 'annotations',
        label: 'Annotations',
        hint: 'Legacy clickable overlays baked into older videos',
        js: true,
        verb: 'Disable'
      }
    ]
  },
  {
    id: 'chrome',
    label: 'Header & search',
    features: [
      {
        id: 'top_header',
        label: 'Top header',
        hint: 'The masthead with search, create and your avatar',
        children: [
          {
            id: 'notification_bell',
            label: 'Notification bell',
            hint: 'The bell and its unread badge'
          }
        ]
      },
      {
        id: 'search_noise',
        label: 'Irrelevant search results',
        hint: '"People also search for", "Latest from…", "Channels new to you" and friends'
      }
    ]
  }
];

/** Flat list of every feature, parents and children alike, in display order. */
globalThis.FOKUS.ALL = globalThis.FOKUS.GROUPS.flatMap((group) =>
  group.features.flatMap((feature) => [feature, ...(feature.children || [])])
);

/** Feature ids that need JavaScript, not just a CSS rule. */
globalThis.FOKUS.JS_FEATURES = globalThis.FOKUS.ALL.filter((f) => f.js).map((f) => f.id);

/** What a fresh install looks like: the two headline distractions, nothing else. */
globalThis.FOKUS.DEFAULTS = {
  master: true,
  features: { homepage_feed: true, shorts: true }
};

globalThis.FOKUS.STORAGE_KEY = 'fokus:settings';

/** The link behind "Support me" in the popup footer. */
globalThis.FOKUS.SPONSOR_URL = 'https://github.com/sponsors/1Shubham7';
