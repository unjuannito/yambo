apiVersion: v1
kind: Namespace
metadata:
  name: __PREVIEW_NS__
  labels:
    yambo/preview: "true"
    yambo/pr-id: "__PR_ID__"