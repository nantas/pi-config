# Writeback: init-command

## Summary

实现了 `init-command` capability — Pi 扩展，注册 `/init` 斜杠命令，通过 LLM 自主分析仓库结构并创建或更新 AGENTS.md。

## Deliverables

| Artifact | Path | Status |
|----------|------|--------|
| Extension | `.pi/extensions/init-command.ts` | ✅ Created (7,465 bytes) |
| Verification | `openspec/changes/init-command/verification.md` | ✅ Generated |
| Writeback | `openspec/changes/init-command/writeback.md` | ✅ Generated |

## Verification Result

All 6 spec requirements (command-registration, command-accepts-arguments, repository-analysis, agents-md-creation, existing-agents-handling, dedup-and-session-shutdown) are fully covered. Extension loads without errors via `pi -e`. Full spec-to-evidence mapping in verification.md.

## Writeback Target: `.pi/capabilities.yaml`

**Action**: Append `init-command` to `global.extensions` list.

```yaml
global:
  extensions:
    - dollar-skill-invoke
    - planner-toggle
    - output-scroll-viewer
    - subagent-dispatch
    - tool-counter-widget
    - init-command        # <-- NEW
```

**Execution**: ⬜ Pending (task 4.3)

## Writeback Target: `scripts/sync-pi-agent.sh`

**Action**: Run `scripts/sync-pi-agent.sh` to sync to `~/.pi/agent/extensions/`.

**Execution**: ⬜ Pending (task 4.3)
