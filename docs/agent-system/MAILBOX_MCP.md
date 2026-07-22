# AccessRevamp mailbox MCP

This local MCP server lets Codex or Claude Code search and read one authorized Microsoft mailbox at a time, create or update reply drafts, and mark a message read or unread. It never delivers a message.

## Capacity model

The existing AccessRevamp control plane is configured for 100 Icemail Microsoft/Azure mailboxes. Each mailbox has a ceiling of five cold messages plus five provider-managed warm-up actions per day, for 500 cold and 500 warm-up actions across the fleet.

Those numbers are capacity metadata, not permission. A mailbox must be registered, active, and separately authorized before the MCP can read or change it. The outreach sender remains disabled and is outside this server.

## Non-negotiable boundaries

- Microsoft Graph application permission is `Mail.ReadWrite` only. Do not grant `Mail.Send`.
- Scope the application to the exact AccessRevamp mailbox group with Exchange Online application RBAC.
- Never give the model an Icemail mailbox password, Graph token, application secret, or Supabase service-role key.
- A content operation accepts exactly one mailbox address.
- Search results are capped, bodies are truncated, attachments are not returned, and provider headers are removed.
- Draft and message-state writes require both a global environment switch and per-mailbox authorization.
- Every operation writes an AccessRevamp audit record. Draft bodies are represented by length and SHA-256, not stored in the audit log.
- Icemail inventory sync uses the reduced domain-mailbox endpoint that omits mailbox passwords.

## Components

- `tools/mailbox-mcp/server.mjs`: stdio MCP server and tool policy.
- `tools/mailbox-mcp/graph-client.mjs`: Microsoft Graph application client.
- `tools/mailbox-mcp/icemail-client.mjs`: credential-free Icemail inventory reader.
- `tools/mailbox-mcp/repository.mjs`: Supabase authorization and audit adapter.
- `tools/mailbox-mcp/doctor.mjs`: connectivity and configuration checks without reading mail.
- `supabase/migrations/20260722130000_mailbox_mcp_control_plane.sql`: forward-only authorization schema.
- `.codex/config.toml.example`: project-scoped Codex configuration.
- `.mcp.json.example`: project-scoped Claude Code configuration.

## MCP tools

| Tool | Effect | Default approval |
| --- | --- | --- |
| `mailbox_capacity` | Reads configured and authorized capacity | Automatic in the Codex example |
| `list_mailboxes` | Reads registry and authorization state | Automatic in the Codex example |
| `search_messages` | Searches one authorized mailbox | Automatic in the Codex example |
| `read_message` | Reads one message | Automatic in the Codex example |
| `create_reply_draft` | Creates an editable reply draft | Prompt |
| `update_reply_draft` | Replaces the body of an existing draft | Prompt |
| `set_message_read_state` | Marks one message read or unread | Prompt |
| `sync_icemail_inventory` | Registers reduced Icemail inventory only | Prompt |

There is deliberately no delivery, bulk-send, warm-up, “not spam,” attachment-download, mailbox-password, or mailbox-authorization tool.

## 1. Apply the database migration after review

Do not apply the migration merely to test the JavaScript. Review the SQL diff first, then apply it through the normal Supabase migration process. The migration:

- adds provider inventory identifiers and three explicit authorization flags;
- adds a service-only delta-cursor table with RLS;
- adds `configure_accessrevamp_mailbox_access(...)`, which requires a reason and writes an audit event;
- does not modify `outbound_authorized` or enable external email transport.

Newly synchronized mailboxes have all content permissions set to false.

## 2. Create the Microsoft Entra application

Use a dedicated single-tenant application registration for AccessRevamp mailbox operations.

1. Upload a certificate credential for production. A client secret is supported only for local development.
2. Grant Microsoft Graph **application** permission `Mail.ReadWrite` and complete admin consent.
3. Do not add `Mail.Send`.
4. In Exchange Online, create an application RBAC assignment scoped to a mail-enabled group containing only the AccessRevamp mailboxes.
5. Test the scope with one pilot mailbox before adding the remaining addresses.

Application permissions are tenant-wide unless Exchange constrains them. The database flags are a second enforcement layer, not a substitute for provider-side scoping.

## 3. Set local environment values

Copy the mailbox section from `.env.example` into an ignored local environment or a secure secret manager. Required values are:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ACCESSREVAMP_GRAPH_TENANT_ID
ACCESSREVAMP_GRAPH_CLIENT_ID
ACCESSREVAMP_GRAPH_CERTIFICATE_PATH
```

For a temporary development setup, `ACCESSREVAMP_GRAPH_CLIENT_SECRET` can replace the certificate path. Never place a value in a tracked file or an agent prompt.

Keep these switches false during setup:

```text
ACCESSREVAMP_MAILBOX_DRAFT_WRITES_ENABLED=false
ACCESSREVAMP_MESSAGE_STATE_WRITES_ENABLED=false
ACCESSREVAMP_ICEMAIL_INVENTORY_SYNC_ENABLED=false
```

Run the non-content diagnostic:

```powershell
npm run mailbox:mcp:doctor
```

The doctor checks Supabase capacity and obtains a Graph application token. It does not query a mailbox.

## 4. Synchronize Icemail inventory

Set `ICEMAIL_API_KEY` locally and temporarily enable:

```text
ACCESSREVAMP_ICEMAIL_INVENTORY_SYNC_ENABLED=true
```

Start the MCP and invoke `sync_icemail_inventory` with the exact confirmation text `SYNC ICEMAIL INVENTORY`. A domain filter is recommended for the first run. The tool reads `/domain` and `/mailbox/domain/{domainId}` only.

After inventory is registered, set the switch back to false. Inventory sync changes provider identifiers and status, but it does not grant content access or outbound authority.

## 5. Authorize one pilot mailbox

After confirming that the mailbox is active and falls inside the Exchange application scope, run the service-role RPC with a specific reason:

```sql
select *
from public.configure_accessrevamp_mailbox_access(
  'pilot@example.com',
  true,  -- read
  true,  -- create and update drafts
  true,  -- mark read or unread
  true,  -- reply handling
  'Approved pilot for supervised customer-inbox triage',
  null
);
```

Use false values in the same function to revoke access. Never authorize all 100 mailboxes in one unreviewed statement.

## 6. Install the agent configurations

On Windows, run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-mailbox-mcp.ps1
```

The installer copies the example files to ignored local files and runs the doctor when the required environment is present. It never writes secret values.

Manual installation is equivalent:

```powershell
Copy-Item .codex/config.toml.example .codex/config.toml
Copy-Item .mcp.json.example .mcp.json
```

Verify the clients:

```text
codex mcp list
claude mcp list
```

Codex reads `.codex/config.toml` only for a trusted project. Claude Code asks for project MCP approval when it first sees `.mcp.json`.

## 7. Enable supervised writes

After read-only tests pass for the pilot, enable only the needed local switch:

```text
ACCESSREVAMP_MAILBOX_DRAFT_WRITES_ENABLED=true
ACCESSREVAMP_MESSAGE_STATE_WRITES_ENABLED=true
```

The intended workflow is:

1. Search a single mailbox for a customer, order, or project reference.
2. Read the minimum messages needed for context.
3. Ask the agent to prepare a reply draft with an explicit approval note.
4. Review the draft in Outlook or the mailbox provider UI.
5. Deliver it manually through the provider UI under the normal account controls.

The MCP result must always describe the object as a draft. Creating a draft is not evidence that a message was delivered.

## Expansion to the remaining mailboxes

Expand only after the pilot has clean audit logs and correct provider scoping. Add mailboxes in small batches, verify each address is owned by AccessRevamp, confirm its active state, then call the authorization RPC with a batch-specific reason. Keep outbound cold-message approval and provider-managed warm-up as separate workflows.

## Cost statement

The MCP gateway code is self-hosted and adds no required middleware subscription. It does not make the underlying system free: Icemail or Microsoft mailbox service, hosting, Supabase usage above its included tier, and Codex or Claude usage can still incur charges. Do not bypass provider limits, licensing, or account controls.

## Troubleshooting

- **Doctor reports missing Graph credentials:** set either the certificate path or the development client secret, not both in shared configuration.
- **Graph returns authorization denied:** verify admin consent and the Exchange application RBAC assignment for that exact mailbox.
- **Mailbox is registered but tools deny access:** check status is `active`, then inspect `read_authorized`, `draft_authorized`, `message_state_write_authorized`, and `reply_handling_authorized`.
- **Draft tool is disabled:** set the local feature switch only after the mailbox flags and provider scope are correct.
- **Inventory returns zero:** confirm the Icemail API key, domain filter, and that the domain is a Microsoft workspace.
- **Agent cannot see the server:** verify the local config was installed, restart Codex or Claude Code, and run the client MCP list command.
