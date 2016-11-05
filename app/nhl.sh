#!/bin/bash -e

# install prereqs:
# brew install jq
# brew install https://raw.githubusercontent.com/EricChiang/pup/master/pup.rb

CURRENT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$CURRENT_DIR"

TEAM_NAME="$1"
DATE="$2"

if [[ "$TEAM_NAME" == "" ]]; then
  echo "TEAM_NAME must be specified" 1>&2
  exit 1
elif [[ ! "$TEAM_NAME" =~ ^[a-z\ ]+$ ]]; then
  echo "TEAM_NAME must be a lower case set of words, such as 'sharks' or 'maple leafs'" 1>&2
  exit 1
fi

if [[ "$DATE" == "" ]]; then
  DATE="$( TZ="America/Los_Angeles" date "+%Y-%m-%d" )"
elif [[ ! "$DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "DATE must be in format YYYY-MM-DD" 1>&2
  exit 1
fi

nhl_api_url="https://statsapi.web.nhl.com/api/v1"

cache_teams="cache/_teams.json"
if [[ ! -f "$cache_teams" ]]; then
  mkdir -p "$( dirname "$cache_teams" )"

  nhl_teams_json="$( curl -s "${nhl_api_url}/teams" | tee "$cache_teams" )"
else
  nhl_teams_json="$( cat "$cache_teams" )"
fi

nhl_team_name_to_id="$( echo "$nhl_teams_json" | jq '[.teams[] | {key: .teamName | ascii_downcase, value: .id}] | from_entries' )"
nhl_team_id_to_full_name="$( echo "$nhl_teams_json" | jq '[.teams[] | {key: .id | tostring, value: .name}] | from_entries' )"

team_id="$( echo "$nhl_team_name_to_id" | jq '.["'"$TEAM_NAME"'"]' )"

if [[ "$team_id" == "null" ]]; then
  echo "Team not found: '$TEAM_NAME'" 1>&2
  exit 1
fi

cache_schedule="cache/${DATE}/${team_id}.json"
if [[ ! -f "$cache_schedule" ]]; then
  mkdir -p "$( dirname "$cache_schedule" )"

  nhl_schedule_url="${nhl_api_url}/schedule?site=en_nhl&expand=schedule.broadcasts.all&startDate=${DATE}&endDate=${DATE}&teamId=${team_id}"
  nhl_schedule_json="$( curl -s "${nhl_schedule_url}" | tee "$cache_schedule" )"
else
  nhl_schedule_json="$( cat "$cache_schedule" )"
fi

schedule="$( echo "$nhl_schedule_json" | jq '[
  .dates[].games[] | {
    home: .teams.home.team.id,
    away: .teams.away.team.id,
    gameDate: .gameDate,
    broadcasts: [.broadcasts[]?.name]
  }
]' )"

echo "$schedule" | jq --arg teamId "$team_id" --argjson fromId "$nhl_team_id_to_full_name" '{
  schedule: [
    .[] | 
    $fromId[.home | tostring] as $homeName |
    $fromId[.away | tostring] as $awayName |
    ($teamId == (.home | tostring)) as $isHome |
    (if $isHome then $homeName + " vs " + $awayName else $awayName + " at " + $homeName end) as $title |
    {
      title: $title,
      home: {id: .home, name: $homeName},
      away: {id: .away, name: $awayName},
      gameDate,
      broadcasts  
    }
  ]
}'
