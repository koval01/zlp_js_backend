#!/bin/bash

npm start | while IFS= read -r line; do printf '%s %s\n' "$(date)" "$line"; done

