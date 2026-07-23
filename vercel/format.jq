# Extracts + formats vercel-ls.json into render-ready rows in a single pass.
# Usage: jq -c -f format.jq --argjson now "$NOW_MS" vercel-ls.json
#
# Each output line is one JSON object:
#   branchRaw        - raw git ref from commit metadata
#   branchDisplay     - "master (source-branch)" for default-branch merge commits, else branchRaw
#   isDefaultBranch   - true for master/main rows (Deployment column stays blank, no 🚀 needed there)
#   state             - READY / BUILDING / QUEUED / ERROR / CANCELED (map to emoji in the render step)
#   isProd            - true on the single newest READY row with target == "production"
#   author            - first name only
#   ran               - formatted duration string, e.g. "2m 49s" / "1h 16m" / "3d" / "21s"
#   started           - formatted "ago" string (largest unit only) or null for BUILDING/QUEUED rows
#   url, branchAlias  - link targets

def fmt_dur(ms):
	(ms / 1000) as $s
	| ($s / 86400 | floor) as $d
	| (($s - $d * 86400) / 3600 | floor) as $h
	| (($s - $d * 86400 - $h * 3600) / 60 | floor) as $m
	| ($s - $d * 86400 - $h * 3600 - $m * 60 | floor) as $sec
	| if $d > 0 then (if $h > 0 then "\($d)d \($h)h" else "\($d)d" end)
	  elif $h > 0 then (if $m > 0 then "\($h)h \($m)m" else "\($h)h" end)
	  elif $m > 0 then (if $sec > 0 then "\($m)m \($sec)s" else "\($m)m" end)
	  else "\($sec)s"
	  end;

def fmt_ago(ms):
	(ms / 1000) as $s
	| if $s < 60 then "<1m ago"
	  elif $s < 3600 then "\($s / 60 | floor)m ago"
	  elif $s < 86400 then "\($s / 3600 | floor)h ago"
	  else "\($s / 86400 | floor)d ago"
	  end;

def firstCapture(msg; re):
	[msg | match(re)] as $ms
	| if ($ms | length) > 0 then $ms[0].captures[0].string else null end;

def mergeBranch(msg):
	firstCapture(msg; "Merged in (\\S+) \\(pull request #\\d+\\)") as $b1
	| if $b1 != null then $b1
	  else firstCapture(msg; "Merge pull request #\\d+ from (\\S+)")
	  end;

.deployments[0:15] as $rows
| ($rows | map(.state == "READY" and .target == "production") | index(true)) as $prodIdx
| $rows
| to_entries
| map(
	.key as $i
	| .value as $d
	| ($d.meta.bitbucketCommitRef // $d.meta.githubCommitRef // $d.meta.gitlabCommitRef // "unknown") as $ref
	| ($d.meta.bitbucketCommitAuthorName // $d.meta.githubCommitAuthorName // $d.meta.gitlabCommitAuthorName // $d.creator.username // "unknown") as $authorFull
	| ($d.meta.bitbucketCommitMessage // $d.meta.githubCommitMessage // $d.meta.gitlabCommitMessage // "") as $msg
	| ($ref == "master" or $ref == "main") as $isDefault
	| (if $isDefault then mergeBranch($msg) else null end) as $mb
	| {
		branchRaw: $ref,
		branchDisplay: (if $mb != null then "\($ref) (\($mb))" else $ref end),
		isDefaultBranch: $isDefault,
		state: $d.state,
		target: $d.target,
		isProd: ($i == $prodIdx),
		author: ($authorFull | split(" ")[0]),
		ran: (if $d.state == "BUILDING" or $d.state == "QUEUED"
		      then fmt_dur($now - ($d.buildingAt // $d.createdAt))
		      else fmt_dur($d.ready - $d.buildingAt)
		      end),
		started: (if $d.state == "BUILDING" or $d.state == "QUEUED"
		          then null
		          else fmt_ago($now - $d.createdAt)
		          end),
		url: $d.url,
		branchAlias: ($d.meta.branchAlias // $d.url)
	}
)
| .[]
