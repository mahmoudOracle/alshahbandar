# BRANCH STRUCTURE VISUAL REFERENCE

## Current State: 06Feb26 (8 Commits, Out of Scope)

```
c72cbda (HEAD -> 06Feb26, origin/06Feb26)
│   Add project completion certificate
│   FILES: PROJECT_COMPLETION_CERTIFICATE.md (+228)
│   ❌ DOCUMENTATION ONLY - EXCLUDE
│
da2dc0e
│   Add delivery summary package
│   FILES: DELIVERY_SUMMARY.md (+228)
│   ❌ DOCUMENTATION ONLY - EXCLUDE
│
9d3fc05
│   Phase 6: final acceptance + delivery
│   FILES: src/i18n/ar.ts (+20), PHASE6_FINAL_ACCEPTANCE_DELIVERY.md (+600)
│   ❌ PHASE 6 (OUT OF SCOPE) - EXCLUDE
│
26e16f6
│   Phase 5: reports flexibility
│   FILES: src/i18n/ar.ts (+18), PHASE5_REPORTS_FLEXIBILITY_DELIVERY.md (+400)
│   ❌ PHASE 5 (OUT OF SCOPE) - EXCLUDE
│
cedf2a0
│   Phase 4: settings reorganization
│   FILES: src/i18n/ar.ts (+14), PHASE4_SETTINGS_REORGANIZATION_DELIVERY.md (+350)
│   ❌ PHASE 4 (OUT OF SCOPE) - EXCLUDE
│
51d48a0
│   Phase 3: products stock consistency + dropdown z-index fix
│   FILES: components/ui/SearchableSelect.tsx (+1 line z-index change), src/i18n/ar.ts (+11), etc
│   ❌ PHASE 3 (OUT OF SCOPE) - EXCLUDE
│
40aeda3
│   Phase 2: invoice UI + export quality
│   FILES: services/exportUtils.ts (+5), components/ExportSettings.tsx (+139 NEW),
│           components/ui/SearchableSelect.tsx (+1), src/i18n/ar.ts (+55)
│   ✅ INCLUDE IN PR2 - cherry-pick this
│
07ba8f9
│   Phase 0-1: proof-based audit + daily collection verification
│   FILES: 0 code files (audit only, documentation)
│   ✅ INCLUDE IN PR1 - cherry-pick this
│
a90ad3d (05Feb26)
│   Fix accessibility: ActionMenu + Modal aria-labels to i18n
│   ← BASE (not in scope, reference only)
```

---

## Proposed State: Two Clean Branches

### Branch 06Feb26-PH01 (Phase 0-1 Audit)

```
06Feb26-PH01 (new branch from origin/main)
│
└─ 07ba8f9
    Phase 0-1: proof-based audit + daily collection verification
    FILES: 0 code changes (proof-based audit)
    BUILD: ✅ PASSING (921 modules, 0 errors)
    READY: ✅ YES
    
├─ origin/main (parent)
```

**Cherry-pick command:**
```bash
git checkout -b 06Feb26-PH01 origin/main && git cherry-pick 07ba8f9
```

**Result:** Single commit PR, ready for review/merge

---

### Branch 06Feb26-PH02 (Phase 2 Invoice/Export)

```
06Feb26-PH02 (new branch from origin/main)
│
└─ 40aeda3
    Phase 2: invoice UI + export quality
    FILES: 
      ✓ services/exportUtils.ts (+5 lines) - scale parameter
      ✓ components/ExportSettings.tsx (+139 lines) - NEW modal
      ✓ components/ui/SearchableSelect.tsx (+1 line) - z-index fix
      ✓ src/i18n/ar.ts (+55 lines) - translations
    BUILD: ✅ PASSING (921 modules, 9.25s)
    READY: ⚠️ NEEDS INTEGRATION (ExportSettings not used)
    
├─ origin/main (parent)
```

**Cherry-pick command:**
```bash
git checkout -b 06Feb26-PH02 origin/main && git cherry-pick 40aeda3
```

**Result:** Single commit PR, needs ExportSettings integration before merge

---

## File Changes per Phase

### PR1 (Phase 0-1): 0 Code Files
```
📄 DOCUMENTATION ONLY
  └─ Proof artifacts (audit reports, logs)
```

### PR2 (Phase 2): 4 Code Files
```
📝 services/exportUtils.ts
   OLD: export const exportElementAs = async (
          element, filenameBase, format,
          // NO scale parameter
        )
   NEW: export const exportElementAs = async (
          element, filenameBase, format,
          scale: number = 2  // ← NEW parameter
        )
   STATUS: 🟡 MEDIUM RISK - verify all callers

📝 components/ui/SearchableSelect.tsx
   OLD: className="absolute z-40 mt-1 w-full ..."
   NEW: className="absolute z-50 mt-1 w-full ..."
   STATUS: 🟢 LOW RISK - CSS only

🆕 components/ExportSettings.tsx
   NEW: 139-line React modal component
   STATUS: ⚠️ NOT INTEGRATED - needs InvoiceDetail.tsx update

📝 src/i18n/ar.ts
   ADDED: 55 new translation keys
   STATUS: 🟢 LOW RISK - translations only
```

---

## Risk Assessment

### Phase 0-1 (Audit): 🟢 ZERO RISK
- No code changes
- No breaking changes
- No dependencies
- ✅ Safe to merge immediately

### Phase 2 (Invoice/Export): 🟡 MEDIUM RISK
- Export scale parameter: Need to verify all callers
- Dropdown z-index: Need to verify no modal z-index > 50
- ExportSettings component: Not integrated yet (blocker)

### Phases 3-6: ❌ OUT OF SCOPE
- Do not include in production PRs
- Keep in reference branch for future phases
- Consider as post-v2.0 roadmap

---

## Testing Requirements

### PR1 (Phase 0-1): Build Verification Only
```bash
✅ npm run build → 921 modules, 0 errors
✅ git log shows single commit
✅ No code files changed
```

### PR2 (Phase 2): Full Testing Required
```bash
✅ npm run build → 921 modules, 0 errors

⚠️ Code Review:
   - [ ] All exportElementAs() callers verified
   - [ ] Z-index 50 doesn't break any modal
   - [ ] ExportSettings integrated into InvoiceDetail.tsx
   - [ ] No import errors

⚠️ Manual Testing:
   - [ ] Create invoice
   - [ ] Export to PDF (verify scale 2 = ~2MB file)
   - [ ] Export to PNG (verify quality)
   - [ ] Dropdown appears above content (z-index 50)
   - [ ] Daily Collection still exports correctly
```

---

## Commands Reference

### Cherry-pick PR1
```bash
git fetch origin
git checkout -b 06Feb26-PH01 origin/main
git cherry-pick 07ba8f9
git log --oneline -n 3
npm run build
git push -u origin 06Feb26-PH01
```

### Cherry-pick PR2
```bash
git fetch origin
git checkout -b 06Feb26-PH02 origin/main
git cherry-pick 40aeda3
git log --oneline -n 3
npm run build
git push -u origin 06Feb26-PH02
```

### Verify Before Cherry-pick
```bash
# Check commit details
git show 07ba8f9 --stat
git show 40aeda3 --stat

# Check for conflicts
git merge-base --is-ancestor 07ba8f9 origin/main && echo "No conflicts expected"
git merge-base --is-ancestor 40aeda3 origin/main && echo "No conflicts expected"
```

### Cleanup After Merge
```bash
# After PRs are merged, optionally archive original
git branch -m 06Feb26 06Feb26-archived
git push origin --delete 06Feb26
```

---

## Summary Table

| Item | Phase 0-1 | Phase 2 | Status |
|------|-----------|---------|--------|
| **Commits** | 1 | 1 | ✅ Isolated |
| **Code Files** | 0 | 4 | ✅ Clear |
| **Build** | PASS | PASS | ✅ Valid |
| **Risk Level** | ZERO | MEDIUM | ⚠️ Manageable |
| **Approval** | READY | NEEDS INTEGRATION | ⏳ Blocked |
| **Cherry-pick Ready** | ✅ YES | ✅ YES | ✅ Both Ready |

---

**Document:** BRANCH_STRUCTURE_VISUAL_REFERENCE.md  
**Purpose:** Quick visual guide for cleanup execution  
**Status:** Ready for implementation
