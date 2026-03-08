import requests
import sys
import json
from datetime import datetime

class FunnelFoxAPITester:
    def __init__(self, base_url="https://FunnelFox-88.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.created_business_id = None
        self.created_campaign_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else self.api_url
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root Endpoint", "GET", "", 200)

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        return self.run_test("Dashboard Stats", "GET", "dashboard/stats", 200)

    def test_find_businesses(self):
        """Test business finding with Serper API"""
        data = {
            "location": "New York, NY",
            "businessType": "coffee shops",
            "count": 5
        }
        success, response = self.run_test("Find Businesses", "POST", "businesses/find", 200, data)
        if success and response.get('businesses'):
            # Store first business ID for later tests
            businesses = response.get('businesses', [])
            if businesses:
                self.created_business_id = businesses[0]['id']
                print(f"   Stored business ID: {self.created_business_id}")
        return success, response

    def test_get_businesses(self):
        """Test getting businesses with filters"""
        # Test without filters
        success1, _ = self.run_test("Get All Businesses", "GET", "businesses", 200)
        
        # Test with status filter
        success2, _ = self.run_test("Get Businesses by Status", "GET", "businesses", 200, params={"status": "New"})
        
        # Test with search
        success3, _ = self.run_test("Search Businesses", "GET", "businesses", 200, params={"search": "coffee"})
        
        return success1 and success2 and success3, {}

    def test_update_business_status(self):
        """Test updating business status"""
        if not self.created_business_id:
            print("⚠️  Skipping status update - no business ID available")
            return True, {}
        
        data = {
            "status": "Contacted"
        }
        return self.run_test("Update Business Status", "PATCH", f"businesses/{self.created_business_id}/status", 200, data)

    def test_create_campaign(self):
        """Test creating a campaign"""
        data = {
            "name": f"Test Campaign {datetime.now().strftime('%H%M%S')}",
            "template": "Hi there! We offer professional web development services. Interested in learning more?",
            "expiresAt": None
        }
        success, response = self.run_test("Create Campaign", "POST", "campaigns", 200, data)
        if success and response.get('id'):
            self.created_campaign_id = response['id']
            print(f"   Stored campaign ID: {self.created_campaign_id}")
        return success, response

    def test_get_campaigns(self):
        """Test getting campaigns"""
        return self.run_test("Get Campaigns", "GET", "campaigns", 200)

    def test_generate_email(self):
        """Test email generation with Gemini"""
        data = {
            "businessName": "Test Coffee Shop",
            "hasWebsite": False
        }
        return self.run_test("Generate Email", "POST", "emails/generate", 200, data)

    def test_send_emails(self):
        """Test sending emails"""
        if not self.created_business_id:
            print("⚠️  Skipping email sending - no business ID available")
            return True, {}
        
        data = {
            "businessIds": [self.created_business_id],
            "customMessage": "This is a test email from our lead generation system."
        }
        return self.run_test("Send Emails", "POST", "emails/send", 200, data)

    def test_blocklist_operations(self):
        """Test blocklist operations"""
        # Get blocklist
        success1, _ = self.run_test("Get Blocklist", "GET", "blocklist", 200)
        
        if not self.created_business_id:
            print("⚠️  Skipping block/unblock - no business ID available")
            return success1, {}
        
        # Block business
        success2, _ = self.run_test("Block Business", "POST", f"blocklist/{self.created_business_id}", 200)
        
        # Unblock business
        success3, _ = self.run_test("Unblock Business", "DELETE", f"blocklist/{self.created_business_id}", 200)
        
        return success1 and success2 and success3, {}

    def test_reports(self):
        """Test all report endpoints"""
        success1, _ = self.run_test("Funnel Report", "GET", "reports/funnel", 200)
        success2, _ = self.run_test("Campaign Performance", "GET", "reports/campaigns", 200)
        success3, _ = self.run_test("Lost Reasons", "GET", "reports/lost-reasons", 200)
        
        return success1 and success2 and success3, {}

    def test_delete_campaign(self):
        """Test deleting a campaign"""
        if not self.created_campaign_id:
            print("⚠️  Skipping campaign deletion - no campaign ID available")
            return True, {}
        
        return self.run_test("Delete Campaign", "DELETE", f"campaigns/{self.created_campaign_id}", 200)

    def test_delete_business(self):
        """Test deleting a business"""
        if not self.created_business_id:
            print("⚠️  Skipping business deletion - no business ID available")
            return True, {}
        
        return self.run_test("Delete Business", "DELETE", f"businesses/{self.created_business_id}", 200)

def main():
    print("🚀 Starting FunnelFox API Tests...")
    print("=" * 50)
    
    tester = FunnelFoxAPITester()
    
    # Test sequence
    tests = [
        ("Root Endpoint", tester.test_root_endpoint),
        ("Dashboard Stats", tester.test_dashboard_stats),
        ("Find Businesses", tester.test_find_businesses),
        ("Get Businesses", tester.test_get_businesses),
        ("Update Business Status", tester.test_update_business_status),
        ("Create Campaign", tester.test_create_campaign),
        ("Get Campaigns", tester.test_get_campaigns),
        ("Generate Email", tester.test_generate_email),
        ("Send Emails", tester.test_send_emails),
        ("Blocklist Operations", tester.test_blocklist_operations),
        ("Reports", tester.test_reports),
        ("Delete Campaign", tester.test_delete_campaign),
        ("Delete Business", tester.test_delete_business),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            success, _ = test_func()
            if not success:
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            failed_tests.append(test_name)
            tester.tests_run += 1
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if failed_tests:
        print(f"❌ Failed tests: {', '.join(failed_tests)}")
        return 1
    else:
        print("✅ All tests passed!")
        return 0

if __name__ == "__main__":
    sys.exit(main())