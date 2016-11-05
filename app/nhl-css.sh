#!/bin/bash -e

CURRENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$CURRENT_DIR"

cache_logos_url="cache/logos-url.json"
if [[ ! -f "$cache_logos_url" ]]; then
  mkdir -p "$( dirname "$cache_logos_url" )"

  nhl_url="https://www.nhl.com/sharks/schedule"
  nhl_html="$( curl -s "$nhl_url" )"
  site_core_build_path="$( echo "$nhl_html" | pup 'meta[name="siteCoreBuildPath"] attr{content}' )"
  site_core_version_directory="$( echo "$nhl_html" | pup 'meta[name="siteCoreBuildVersionDirectory"] attr{content}' )"
  nhl_logos_url="https:${site_core_build_path}/site-core/${site_core_version_directory}styles/nhl-logos.css.gz"
  echo "$nhl_logos_url" | jq -R '{logosUrl: .}' | tee "$cache_logos_url"
else
  cat "$cache_logos_url"
fi
