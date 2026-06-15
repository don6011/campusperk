import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, XCircle, AlertCircle, Loader2, ExternalLink, RefreshCw } from "lucide-react";
import SEO from "@/components/SEO";

type Status = "idle" | "checking" | "ok" | "warn" | "fail";

interface CheckResult {
  status: Status;
  message: string;
  detail?: string;
}

const StatusIcon = ({ status }: { status: Status }) => {
  if (status === "checking") return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  if (status === "ok") return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  if (status === "warn") return <AlertCircle className="h-5 w-5 text-yellow-500" />;
  if (status === "fail") return <XCircle className="h-5 w-5 text-red-500" />;
  return <div className="h-5 w-5 rounded-full border border-muted" />;
};

export default function GitHubSyncTroubleshoot() {
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [expectedBranch, setExpectedBranch] = useState("main");
  const [running, setRunning] = useState(false);

  const [repoCheck, setRepoCheck] = useState<CheckResult>({ status: "idle", message: "Repository reachable" });
  const [branchCheck, setBranchCheck] = useState<CheckResult>({ status: "idle", message: "Branch exists and has commits" });
  const [commitCheck, setCommitCheck] = useState<CheckResult>({ status: "idle", message: "Latest commit on branch" });
  const [appCheck, setAppCheck] = useState<CheckResult>({ status: "idle", message: "Lovable GitHub App installation" });

  const reset = () => {
    setRepoCheck({ status: "idle", message: "Repository reachable" });
    setBranchCheck({ status: "idle", message: "Branch exists and has commits" });
    setCommitCheck({ status: "idle", message: "Latest commit on branch" });
    setAppCheck({ status: "idle", message: "Lovable GitHub App installation" });
  };

  const runChecks = async () => {
    if (!owner.trim() || !repo.trim()) return;
    setRunning(true);
    reset();

    // 1. Repo reachable (public GitHub REST)
    setRepoCheck({ status: "checking", message: "Checking repository..." });
    let defaultBranch = "";
    let isPrivate = false;
    try {
      const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
      if (r.status === 404) {
        setRepoCheck({
          status: "warn",
          message: "Repository not reachable via public API",
          detail: "It may be private (expected for most Lovable repos) or the owner/name is wrong. Continuing with branch + app checks.",
        });
      } else if (!r.ok) {
        setRepoCheck({ status: "fail", message: `GitHub API error: ${r.status}` });
      } else {
        const data = await r.json();
        defaultBranch = data.default_branch;
        isPrivate = data.private;
        setRepoCheck({
          status: "ok",
          message: `Repository found (${isPrivate ? "private" : "public"})`,
          detail: `Default branch on GitHub: ${defaultBranch}`,
        });
      }
    } catch (e: any) {
      setRepoCheck({ status: "fail", message: "Network error reaching GitHub", detail: e.message });
    }

    // 2. Branch exists + 3. latest commit
    setBranchCheck({ status: "checking", message: "Checking branch..." });
    setCommitCheck({ status: "checking", message: "Fetching latest commit..." });
    try {
      const b = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches/${expectedBranch}`);
      if (b.status === 404) {
        setBranchCheck({
          status: "fail",
          message: `Branch "${expectedBranch}" not found`,
          detail: defaultBranch
            ? `Try the default branch instead: ${defaultBranch}`
            : "Verify the branch name on GitHub. Lovable syncs from the connected branch only.",
        });
        setCommitCheck({ status: "fail", message: "No commit to inspect" });
      } else if (b.status === 403 || b.status === 401) {
        setBranchCheck({
          status: "warn",
          message: "Branch is private — cannot verify via public API",
          detail: "This is normal for private repos. Verify the branch manually on GitHub.",
        });
        setCommitCheck({ status: "warn", message: "Latest commit not visible (private repo)" });
      } else if (!b.ok) {
        setBranchCheck({ status: "fail", message: `GitHub API error: ${b.status}` });
        setCommitCheck({ status: "fail", message: "Skipped" });
      } else {
        const data = await b.json();
        setBranchCheck({ status: "ok", message: `Branch "${expectedBranch}" exists` });
        const sha = data.commit?.sha?.slice(0, 7);
        const msg = data.commit?.commit?.message?.split("\n")[0] ?? "";
        const author = data.commit?.commit?.author?.name ?? "";
        const date = data.commit?.commit?.author?.date
          ? new Date(data.commit.commit.author.date).toLocaleString()
          : "";
        setCommitCheck({
          status: "ok",
          message: `Latest: ${sha} — ${msg}`,
          detail: `${author} • ${date}`,
        });
      }
    } catch (e: any) {
      setBranchCheck({ status: "fail", message: "Network error", detail: e.message });
      setCommitCheck({ status: "fail", message: "Skipped" });
    }

    // 4. Lovable GitHub App — cannot verify from browser without auth.
    setAppCheck({
      status: "warn",
      message: "Cannot auto-verify from the browser",
      detail:
        "GitHub requires authentication to check app installations. Open the link below and confirm 'Lovable' (or 'Lovable Dev') is installed and has access to this repo.",
    });

    setRunning(false);
  };

  const installUrl = owner
    ? `https://github.com/${owner.startsWith("@") ? owner.slice(1) : owner}/settings/installations`
    : "https://github.com/settings/installations";
  const repoUrl = owner && repo ? `https://github.com/${owner}/${repo}` : "";
  const branchUrl = repoUrl ? `${repoUrl}/tree/${expectedBranch}` : "";

  const allOk = [repoCheck, branchCheck, commitCheck].every((c) => c.status === "ok");

  return (
    <AdminLayout>
      <SEO
        title="GitHub Sync Troubleshoot | Admin"
        description="Diagnose Lovable ↔ GitHub sync issues: branch, connection, and GitHub App installation."
        path="/admin/github-sync"
      />
      <div className="max-w-3xl mx-auto space-y-6 p-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">GitHub Sync Troubleshoot</h1>
          <p className="text-muted-foreground mt-1">
            Verify that your repository, branch, and the Lovable GitHub App are correctly wired up.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Repository</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="owner">Owner / Org</Label>
                <Input id="owner" placeholder="ghinko" value={owner} onChange={(e) => setOwner(e.target.value.trim())} />
              </div>
              <div>
                <Label htmlFor="repo">Repo</Label>
                <Input id="repo" placeholder="campusperk" value={repo} onChange={(e) => setRepo(e.target.value.trim())} />
              </div>
              <div>
                <Label htmlFor="branch">Branch</Label>
                <Input id="branch" value={expectedBranch} onChange={(e) => setExpectedBranch(e.target.value.trim())} />
              </div>
            </div>
            <Button onClick={runChecks} disabled={running || !owner || !repo} className="gap-2">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Run checks
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { ...repoCheck, key: "repo" },
              { ...branchCheck, key: "branch" },
              { ...commitCheck, key: "commit" },
              { ...appCheck, key: "app" },
            ].map((c) => (
              <div key={c.key} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <StatusIcon status={c.status} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{c.message}</p>
                  {c.detail && <p className="text-sm text-muted-foreground mt-1">{c.detail}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {(repoUrl || branchUrl) && (
          <Card>
            <CardHeader>
              <CardTitle>Quick links</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {repoUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={repoUrl} target="_blank" rel="noreferrer" className="gap-1">
                    Repo <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              )}
              {branchUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={branchUrl} target="_blank" rel="noreferrer" className="gap-1">
                    Branch <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              )}
              <Button variant="outline" size="sm" asChild>
                <a href={installUrl} target="_blank" rel="noreferrer" className="gap-1">
                  GitHub App installations <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Next steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {allOk ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Repo + branch look healthy</AlertTitle>
                <AlertDescription>
                  If Lovable still isn't reflecting commits, force a fresh build by making any tiny edit in chat, or
                  reload the project tab. Then re-run these checks.
                </AlertDescription>
              </Alert>
            ) : null}

            <ol className="list-decimal list-inside space-y-2">
              <li>
                Confirm the branch you push to <strong>matches</strong> the branch Lovable is connected to. Lovable
                only mirrors the connected branch (usually <code>main</code>). PRs and feature branches do not sync.
              </li>
              <li>
                Open the <a className="underline" href={installUrl} target="_blank" rel="noreferrer">GitHub App installations</a>
                {" "}page and verify <strong>Lovable</strong> is installed and has access to{" "}
                <code>{owner || "<owner>"}/{repo || "<repo>"}</code>. If access was scoped to "selected repositories",
                add this repo.
              </li>
              <li>
                In Lovable, open <strong>+ menu → GitHub</strong>. If the connection shows as disconnected or
                outdated, reconnect it.
              </li>
              <li>
                After pushing from Codex/local, hard-refresh the preview (Cmd/Ctrl + Shift + R) to bust the iframe
                cache.
              </li>
              <li>
                If everything above checks out and sync is still broken, it's a platform issue — report it via the
                Help menu so Lovable can re-link the webhook on their side.
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}