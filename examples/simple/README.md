# simple example

This example uses just js with a super simple model

## Install

Run `npm i`... yeah that's it

## Run

To create a user just send a POST request `localhost:1234/user` with body `{firstname: "My", lastname:"Name"}`. This will return an `_id`
To retrieve a user just send a GET request `localhost:1234/user?_id=62f029e80c7d17d95ee22afd`. This will send you back the user created

To tweak the db just change the origin header. `Default = localhost`