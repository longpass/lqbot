#!/usr/bin/env bash
if [ -f index.js ] && [ -f lqbot.db ]; then
  path="$(pwd)"
  line="*/5 * * * * sh -c \"cd $path; ./index.js run\""
  while read l; do
    if [ "$l" = "$line" ]; then
      echo "Already persisted"
      exit
    fi
  done < <(crontab -l)
  (crontab -l; echo "$line") | crontab -
else
  echo "Run persist.sh from the directory lqbot is installed and configured."
fi
