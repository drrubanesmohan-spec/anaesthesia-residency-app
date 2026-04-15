#!/bin/bash
# Push to GitHub and trigger Vercel deployment
git push origin main

curl -s -X POST "https://api.vercel.com/v13/deployments" \
  -H "Authorization: Bearer vcp_6JMPrIC4ns4J9fLCh7ODu05TsdPIQhBi7gU8z2AFyMpUPeDuTZ1yuc2E" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "anesthesia-residency-app",
    "gitSource": {
      "type": "github",
      "repoId": 1205391525,
      "ref": "main"
    }
  }' | python3 -c "import sys,json; d=json.load(sys.stdin); print('Deployed:', d.get('url','error'))"
