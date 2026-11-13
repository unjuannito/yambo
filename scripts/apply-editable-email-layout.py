"""Apply/rollback a reviewed local email-layout plan through the WSL dev database.

Backups are created before running this script. No credentials are read or printed.
Usage: python scripts/apply-editable-email-layout.py .local-backups/email-layout/<stamp>/plan.json [--rollback]
"""
import argparse, base64, json, subprocess, uuid
from pathlib import Path

def literal(value):
    if value is None: return "NULL"
    encoded = base64.b64encode(str(value).encode("utf-8")).decode("ascii")
    return "convert_from(decode('" + encoded + "','base64'),'UTF8')"

def query(sql):
    command = ["wsl", "--", "docker", "exec", "-i", "yambo_devcontainer-db-1", "psql", "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-U", "yambo_user", "-d", "yambo_db"]
    result = subprocess.run(command, input=sql, text=True, encoding="utf-8", capture_output=True, timeout=60)
    if result.returncode: raise RuntimeError(result.stderr)
    return result.stdout

parser = argparse.ArgumentParser(); parser.add_argument("plan"); parser.add_argument("--rollback", action="store_true"); args = parser.parse_args()
plan_path = Path(args.plan).resolve(); project = Path(__file__).resolve().parents[1]
if not plan_path.is_relative_to(project / ".local-backups" / "email-layout"): raise RuntimeError("Expected a local reviewed backup plan")
plan = json.loads(plan_path.read_text(encoding="utf-8"))
sql = ["BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s'; SELECT pg_advisory_xact_lock(hashtext('yambo-email-layout-v1'));"]
for item in plan["updates"]:
    before, after = (item["after"], item["before"]) if args.rollback else (item["before"], item["after"])
    sql.append("DO $layout$ BEGIN IF EXISTS (SELECT 1 FROM email_template WHERE \"key\"=" + literal(item["key"]) + " AND body=" + literal(before) + ") THEN UPDATE email_template SET body=" + literal(after) + ",updated_at=now() WHERE \"key\"=" + literal(item["key"]) + " AND body=" + literal(before) + "; ELSIF NOT EXISTS (SELECT 1 FROM email_template WHERE \"key\"=" + literal(item["key"]) + " AND body=" + literal(after) + ") THEN RAISE EXCEPTION 'Template changed after review; aborting'; END IF; END $layout$;")
if not args.rollback:
    for component in plan["components"]:
        values = [uuid.uuid4().hex[:8], component["key"], component["name"], component["html"], component["description"]]
        sql.append("INSERT INTO email_common_element (id,element_key,name,html,description,created_at,updated_at) SELECT " + ",".join(map(literal, values)) + ",now(),now() WHERE NOT EXISTS (SELECT 1 FROM email_common_element WHERE element_key=" + literal(component["key"]) + ");")
# Rollback leaves the reusable definitions available, avoiding deletion of components another template may use.
sql.append("COMMIT;")
print(query("\n".join(sql)))
rows = json.loads(query("SELECT json_agg(t) FROM (SELECT \"key\",body,subject FROM email_template ORDER BY \"key\") t;"))
expected = {item["key"]: item["before"] if args.rollback else item["after"] for item in plan["updates"]}
for row in rows:
    if row["key"] in expected and row["body"] != expected[row["key"]]: raise RuntimeError("Unexpected body after update: " + row["key"])
(plan_path.parent / ("rollback-verification.json" if args.rollback else "after.json")).write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding="utf-8")
print("Verified", len(expected), "template bodies.")
