#!/bin/bash
until node --env-file=.env index.js > output.log; do
    echo "Server 'autotrolej' crashed with exit code $?.  Respawning.." >&2
    sleep 1
done