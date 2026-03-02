#!/usr/bin/env python3
"""
Generate GitHub Actions Docker workflow files.

Usage:
    python generate_workflow.py --type build --output .github/workflows/docker-ci.yml
    python generate_workflow.py --type push --registry ghcr --output .github/workflows/docker-push.yml
    python generate_workflow.py --type full --output .github/workflows/docker-full.yml
"""

import argparse
from pathlib import Path


WORKFLOWS = {
    "build": '''name: Docker CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build
        uses: docker/build-push-action@v6
        with:
          context: .
          push: false
          tags: ${{ github.repository }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
''',

    "push-ghcr": '''name: Docker Build & Push

on:
  push:
    branches: [main]
    tags: ['v*']

env:
  REGISTRY: ghcr.io

jobs:
  build-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ github.repository }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=sha,prefix=

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
''',

    "push-dockerhub": '''name: Docker Build & Push to Docker Hub

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build-push:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ secrets.DOCKERHUB_USERNAME }}/${{ github.event.repository.name }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=sha,prefix=

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
''',

    "multi-platform": '''name: Docker Multi-Platform Build

on:
  push:
    branches: [main]
    tags: ['v*']

env:
  REGISTRY: ghcr.io

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ github.repository }}

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
''',

    "scan": '''name: Docker Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: false
          load: true
          tags: ${{ github.repository }}:scan

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ github.repository }}:scan
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'
''',

    "size-check": '''name: Docker Size Check

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  size-check:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: false
          load: true
          tags: ${{ github.repository }}:check

      - name: Check image size
        run: |
          SIZE=$(docker image inspect ${{ github.repository }}:check --format='{{{{.Size}}}}')
          SIZE_MB=$((SIZE / 1024 / 1024))
          MAX_SIZE_MB=${{ inputs.max_size_mb || 500 }}
          
          echo "Image size: ${SIZE_MB}MB"
          
          if [ $SIZE_MB -gt $MAX_SIZE_MB ]; then
            echo "::error::Image size (${SIZE_MB}MB) exceeds limit (${MAX_SIZE_MB}MB)"
            exit 1
          fi
          
          echo "✅ Image size check passed"
''',

    "full": '''name: Docker CI/CD

on:
  push:
    branches: [main]
    tags: ['v*']
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.meta.outputs.tags }}
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}

      - name: Build
        uses: docker/build-push-action@v6
        with:
          context: .
          push: false
          load: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Check image size
        run: |
          SIZE=$(docker image inspect ${{ steps.meta.outputs.tags }} --format='{{{{.Size}}}}')
          SIZE_MB=$((SIZE / 1024 / 1024))
          echo "Image size: ${SIZE_MB}MB"
          
          if [ $SIZE_MB -gt 500 ]; then
            echo "::warning::Image size (${SIZE_MB}MB) is large"
          fi

  scan:
    needs: build
    runs-on: ubuntu-latest
    
    steps:
      - name: Run Trivy scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ needs.build.outputs.image }}
          format: 'table'
          exit-code: '1'
          ignore-unfixed: true
          severity: 'CRITICAL,HIGH'

  push:
    needs: [build, scan]
    runs-on: ubuntu-latest
    if: github.event_name != 'pull_request'
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=sha,prefix=

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
'''
}


def main():
    parser = argparse.ArgumentParser(
        description="Generate GitHub Actions Docker workflow files"
    )
    parser.add_argument(
        "--type", "-t",
        choices=["build", "push", "multi-platform", "scan", "size-check", "full"],
        required=True,
        help="Type of workflow to generate"
    )
    parser.add_argument(
        "--registry", "-r",
        choices=["ghcr", "dockerhub"],
        default="ghcr",
        help="Container registry (default: ghcr)"
    )
    parser.add_argument(
        "--output", "-o",
        required=True,
        help="Output file path"
    )

    args = parser.parse_args()

    if args.type == "push":
        workflow_key = f"push-{args.registry}"
    else:
        workflow_key = args.type

    if workflow_key not in WORKFLOWS:
        print(f"Error: Unknown workflow type '{workflow_key}'")
        return 1

    content = WORKFLOWS[workflow_key]
    output_path = Path(args.output)
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(content, encoding="utf-8")
    
    print(f"✅ Generated: {output_path}")
    return 0


if __name__ == "__main__":
    exit(main())
