# Discord bot

A bot for keeping a movie list with data from [YTS](https://yts.torrentbay.to/api).

I do **not** endorse piracy and torrenting movies. This bot was made for purely educational purposes.

## Features currently include

### help

Lists commands and what they do.

### movie add \<query\>

Retrieves data from YTS and sends a menu from which a movie can be chosen. It is then added to the list.

### movie remove \[query\]

Removes from the list all the movies which include the query in their title. If no query is provided clears the list.

### movie list

Lists all the movies currently in the list.

### movie clear

Clears all the messages which relate to movies (start with _movie_) sent by the bot. No data is cleared.

### movie randomise

Randomises the order of the movies currently in the list.

### movie torrents

Returns the movie list with the torrent link for each movie. Prioritises 1080p over 720p and then blu-ray over web.

## Setup

A config file must be created in _.config/config.json_.

```
{
  "token": "YOUR TOKEN GOES HERE",
  "prefix": "::",
  "color": "#4842f5"
}
```
