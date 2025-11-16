#!/bin/bash

#
# Automated Registration Tests Runner
# Orchestrates running test suite with various options
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Default values
USER_COUNT=50
MODE="test"
CLEANUP_BEFORE=false
CLEANUP_AFTER=false
DRY_RUN=false

# Function to print colored messages
print_header() {
  echo -e "\n${BLUE}═══════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════${NC}\n"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to check prerequisites
check_prerequisites() {
  print_header "Checking Prerequisites"

  # Check if node is installed
  if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed"
    exit 1
  fi
  print_success "Node.js found: $(node --version)"

  # Check if ts-node is available
  if ! command -v npx &> /dev/null; then
    print_error "npx is not installed"
    exit 1
  fi
  print_success "npx found"

  # Check if .env files exist
  if [ ! -f "$PROJECT_ROOT/.env.local" ]; then
    print_warning ".env.local not found in project root"
  else
    print_success ".env.local found"
  fi

  # Check if required environment variables are set
  if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    print_warning "NEXT_PUBLIC_SUPABASE_URL not set"
  fi

  if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    print_warning "SUPABASE_SERVICE_KEY not set (required for cleanup)"
  fi

  echo ""
}

# Function to load environment variables
load_env() {
  if [ -f "$PROJECT_ROOT/.env.local" ]; then
    set -a
    source "$PROJECT_ROOT/.env.local"
    set +a
    print_info "Loaded .env.local"
  fi

  if [ -f "$PROJECT_ROOT/.env" ]; then
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
    print_info "Loaded .env"
  fi
}

# Function to cleanup test users
cleanup_users() {
  local dry_run_flag=""
  if [ "$DRY_RUN" = true ]; then
    dry_run_flag="--dry-run"
  fi

  print_header "Cleaning Up Test Users"
  cd "$PROJECT_ROOT"
  # Explicitly pass environment variables to tsx
  NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  pnpm exec tsx "$SCRIPT_DIR/cleanup-test-users.ts" $dry_run_flag
}

# Function to run tests
run_tests() {
  print_header "Running Registration Tests"
  print_info "Testing $USER_COUNT users..."

  cd "$PROJECT_ROOT"
  # Explicitly pass environment variables to tsx
  NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  NEXT_PUBLIC_API_BASE_URL="$NEXT_PUBLIC_API_BASE_URL" \
  NEXT_PUBLIC_WEB_URL="$NEXT_PUBLIC_WEB_URL" \
  pnpm exec tsx "$SCRIPT_DIR/automated-registration-test.ts" "$USER_COUNT"

  if [ $? -eq 0 ]; then
    print_success "Tests completed successfully"
  else
    print_error "Tests failed"
    exit 1
  fi
}

# Function to generate report
generate_report() {
  print_header "Generating Test Report"

  # Find the latest results file
  LATEST_RESULTS=$(ls -t "$SCRIPT_DIR"/test-results-*.json 2>/dev/null | head -n 1)

  if [ -z "$LATEST_RESULTS" ]; then
    print_error "No test results found"
    exit 1
  fi

  print_info "Analyzing: $LATEST_RESULTS"

  cd "$PROJECT_ROOT"
  pnpm exec tsx "$SCRIPT_DIR/test-results-report.ts" "$LATEST_RESULTS"

  if [ $? -eq 0 ]; then
    print_success "Report generated successfully"
  else
    print_error "Report generation failed"
    exit 1
  fi
}

# Function to show usage
show_usage() {
  cat << EOF
Usage: $0 [OPTIONS]

Options:
  -c, --count <number>       Number of users to test (default: 50)
  -m, --mode <mode>          Mode: test, cleanup, report, all (default: test)
  --cleanup-before           Clean up test users before running tests
  --cleanup-after            Clean up test users after running tests
  --dry-run                  Dry run mode (for cleanup)
  -h, --help                 Show this help message

Modes:
  test                       Run registration tests only
  cleanup                    Clean up test users only
  report                     Generate report from latest results
  all                        Run tests and generate report

Examples:
  # Test 5 users (quick test)
  $0 --count 5

  # Test 50 users with cleanup before and after
  $0 --count 50 --cleanup-before --cleanup-after

  # Run full suite (test + report)
  $0 --mode all --count 50

  # Clean up all test users (dry run)
  $0 --mode cleanup --dry-run

  # Generate report from latest results
  $0 --mode report

EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -c|--count)
      USER_COUNT="$2"
      shift 2
      ;;
    -m|--mode)
      MODE="$2"
      shift 2
      ;;
    --cleanup-before)
      CLEANUP_BEFORE=true
      shift
      ;;
    --cleanup-after)
      CLEANUP_AFTER=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      show_usage
      exit 0
      ;;
    *)
      print_error "Unknown option: $1"
      show_usage
      exit 1
      ;;
  esac
done

# Main execution
main() {
  print_header "Automated Registration Test Suite"

  echo "Configuration:"
  echo "  User Count: $USER_COUNT"
  echo "  Mode: $MODE"
  echo "  Cleanup Before: $CLEANUP_BEFORE"
  echo "  Cleanup After: $CLEANUP_AFTER"
  echo "  Dry Run: $DRY_RUN"
  echo ""

  # Check prerequisites
  check_prerequisites

  # Load environment
  load_env

  # Execute based on mode
  case $MODE in
    test)
      if [ "$CLEANUP_BEFORE" = true ]; then
        cleanup_users
      fi
      run_tests
      if [ "$CLEANUP_AFTER" = true ]; then
        cleanup_users
      fi
      ;;

    cleanup)
      cleanup_users
      ;;

    report)
      generate_report
      ;;

    all)
      if [ "$CLEANUP_BEFORE" = true ]; then
        cleanup_users
      fi
      run_tests
      generate_report
      if [ "$CLEANUP_AFTER" = true ]; then
        cleanup_users
      fi
      ;;

    *)
      print_error "Unknown mode: $MODE"
      show_usage
      exit 1
      ;;
  esac

  print_header "Complete"
  print_success "All operations completed successfully"
}

# Run main function
main
