# Pull Request Oprettelse

## Automatisk URL

GitHub har genereret denne URL til PR oprettelse:

https://github.com/DonBent/MadMatch/pull/new/feature/epic-1-tilbudsoversigt

## Manuel Instruktion

1. Åbn URL ovenfor i browser
2. GitHub vil automatisk detektere branch: `feature/epic-1-tilbudsoversigt`
3. Base branch skal være: `main`
4. Titel: **feat: implement epic-1 tilbudsoversigt**
5. Beskrivelse: Kopier indholdet fra `PR_DESCRIPTION.md`
6. Link til Issue #1 ved at tilføje: `Closes #1` (allerede inkluderet i beskrivelse)
7. Tryk "Create Pull Request"

## Verificering

Efter PR er oprettet, verificer:
- ✅ PR title indeholder "epic-1 tilbudsoversigt"
- ✅ PR beskrivelse følger OUTPUT_FORMATS.md template
- ✅ YAML front matter er korrekt
- ✅ Correlation ID: ZHC-MadMatch-20260226-001
- ✅ Related Issue: #1
- ✅ Branch: feature/epic-1-tilbudsoversigt → main
- ✅ Alle checkboxes er afkrydset i Checklist

## Efter PR Oprettelse

Når PR er oprettet, notér PR URL og returner den til main agent.
