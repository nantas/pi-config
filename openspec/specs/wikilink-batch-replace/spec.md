# wikilink-batch-replace Specification

## Purpose
TBD - created by archiving change wikilink-batch-replace. Update Purpose after archive.
## Requirements
### Requirement: batch-replace-with-table-escape
The tool SHALL read a file, apply one or more regex-based pattern replacements with user-provided path mappings, and write the modified file back. For each replacement, the tool MUST detect whether the match falls on a Markdown table row (line starting with `|`) and escape the wikilink pipe separator as `\|` accordingly.

#### Scenario: replace-bare-references-in-mixed-content
- **WHEN** a file contains bare text references (e.g. `#001`) in both normal paragraphs and table rows, and the agent calls `wikilink_batch_replace` with a regex pattern and path mapping
- **THEN** all matches in table rows SHALL produce wikilinks with `\|` separator, and all matches in non-table lines SHALL produce wikilinks with unescaped `|` separator

#### Scenario: multiple-patterns-sequential
- **WHEN** the agent provides multiple pattern configurations in a single call
- **THEN** patterns SHALL be processed sequentially, each operating on the result of the previous pattern

#### Scenario: skip-existing-wikilinks
- **WHEN** a regex match falls inside an existing `[[...]]` wikilink
- **THEN** the tool SHALL skip that match and not produce a replacement

#### Scenario: skip-unmapped-captures
- **WHEN** the captured group value does not exist in the provided mapping
- **THEN** the tool SHALL skip that match and include it in the returned statistics

### Requirement: direct-file-modification
The tool SHALL directly modify the target file on disk and return a statistics summary. The tool MUST NOT return the full file content.

#### Scenario: file-write-and-stats
- **WHEN** the tool completes processing
- **THEN** the file SHALL be overwritten with the modified content, and the tool SHALL return counts of: total replacements (split by table vs non-table), skipped-existing-wikilink count, and skipped-unmapped captures

### Requirement: display-template-support
The tool SHALL support a `displayTemplate` parameter that uses `$1`, `$2`, etc. to reference regex capture groups in the display text of the generated wikilink.

#### Scenario: capture-group-in-display
- **WHEN** the regex is `#(\d{3,})` and displayTemplate is `#$1`
- **THEN** a match on `#001` SHALL produce display text `#001`

### Requirement: single-file-extension
The extension SHALL be implemented as a single TypeScript file with no npm dependencies beyond `@earendil-works/pi-coding-agent` and `@sinclair/typebox`.

#### Scenario: no-external-deps
- **WHEN** the extension is loaded by Pi
- **THEN** it SHALL register exactly one tool and require no additional npm packages

