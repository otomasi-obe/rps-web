#!/usr/bin/env python3
"""
OpenAI Bot
Bot untuk mengirim pesan ke OpenAI GPT-4.1 dan mengambil responsnya
Menggunakan OpenAI API client dengan official OpenAI endpoint
"""

import os
import time
import json
from datetime import datetime
from openai import OpenAI

class OpenAIBot:
    """
    Kelas untuk otomatis mengirim pesan ke OpenAI GPT-4.1 dan mengambil responsnya
    """
    
    def __init__(self, api_key=None):
        """
        Inisialisasi OpenAIBot
        
        Args:
            api_key: Optional API key to use instead of loading from file
        """
        self.client = None
        self.is_ready = False
        self.api_key = api_key  # Use provided API key if available
        self.last_response = None
        self.model = "gpt-5-mini-2025-08-07"
        
    def load_api_key(self):
        """Load OpenAI API key from api_openai.txt file"""
        try:
            # Get the directory where this script is located
            script_dir = os.path.dirname(os.path.abspath(__file__))
            api_file_path = os.path.join(script_dir, 'api_openai.txt')
            
            with open(api_file_path, 'r', encoding='utf-8') as f:
                self.api_key = f.read().strip()
                
            if not self.api_key:
                print("❌ Empty API key in api_openai.txt")
                return False
            
            print("✅ OpenAI API key loaded successfully")
            return True
            
        except FileNotFoundError:
            print("❌ api_openai.txt file not found")
            return False
        except Exception as e:
            print(f"❌ Error loading API key: {e}")
            return False
    
    def setup_driver(self, use_existing_chrome=True):
        """
        Setup OpenAI client (no driver needed for API)
        
        Args:
            use_existing_chrome (bool): Ignored for OpenAI (API-based)
            
        Returns:
            bool: True jika berhasil setup, False jika gagal
        """
        try:
            print("🔧 Setting up OpenAI API client...")
            
            # Load API key if not already provided
            if not self.api_key:
                if not self.load_api_key():
                    print("❌ Failed to load API key")
                    return False
            else:
                print("✅ Using provided API key")
            
            # Initialize OpenAI client with official endpoint
            self.client = OpenAI(
                api_key=self.api_key,
            )
            
            print("✅ OpenAI client initialized successfully")
            return True
            
        except Exception as e:
            print(f"❌ Error setting up OpenAI client: {e}")
            return False
    
    def open_openai(self):
        """
        Initialize OpenAI connection (API-based, no browser needed)
        
        Returns:
            bool: True jika berhasil, False jika gagal
        """
        try:
            print("🤖 Initializing OpenAI connection...")
            
            if not self.client:
                if not self.setup_driver():
                    return False
            
            # Test the connection with a simple request
            try:
                test_completion = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {
                            "role": "user",
                            "content": "Hello, this is a connection test."
                        }
                    ]
                )
                
                if test_completion and test_completion.choices:
                    print("✅ OpenAI connection test successful")
                    self.is_ready = True
                    return True
                else:
                    print("❌ OpenAI connection test failed")
                    return False
                    
            except Exception as e:
                print(f"❌ OpenAI connection test error: {e}")
                return False
            
        except Exception as e:
            print(f"❌ Error initializing OpenAI: {e}")
            return False
    
    def is_bot_ready(self):
        """
        Check if bot is ready to process requests
        
        Returns:
            bool: True jika bot siap, False jika tidak
        """
        return self.is_ready and self.client is not None
    
    def send_message(self, message, max_retries=3):
        """
        Send message to OpenAI GPT-4.1
        
        Args:
            message (str): Pesan yang akan dikirim
            max_retries (int): Maximum retry attempts
            
        Returns:
            str: Response from OpenAI or raises exception
        """
        for attempt in range(max_retries):
            try:
                if not self.is_bot_ready():
                    raise Exception("OpenAI bot not ready")
                
                print(f"📤 Sending message to OpenAI GPT-5 Mini (attempt {attempt + 1})...")
                
                # Send message to OpenAI
                completion = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {
                            "role": "user",
                            "content": message
                        }
                    ]
                )
                
                if completion and completion.choices:
                    self.last_response = completion.choices[0].message.content
                    print("✅ Message sent successfully to OpenAI")
                    return self.last_response
                else:
                    raise Exception("Empty response from OpenAI")
                    
            except Exception as e:
                if attempt < max_retries - 1:
                    print(f"⚠️ OpenAI request failed (attempt {attempt + 1}), retrying: {e}")
                    time.sleep(1)  # Brief delay before retry
                    continue
                else:
                    raise Exception(f"OpenAI request failed after {max_retries} attempts: {e}")
    
    def wait_for_response(self, timeout=90):
        """
        Wait for response (immediate for API-based)
        
        Args:
            timeout (int): Timeout dalam detik (ignored for API)
            
        Returns:
            bool: True jika ada respons, False jika timeout/error
        """
        # For API-based bot, response is immediate
        return self.last_response is not None
    
    def get_latest_response(self):
        """
        Get latest response from OpenAI
        
        Returns:
            str: Respons terbaru atau None jika tidak ada
        """
        return self.last_response
    
    def get_latest_response_with_formatting(self):
        """
        Get latest response with formatting preserved
        
        Returns:
            dict: Dictionary dengan formatted_text dan text
        """
        if not self.last_response:
            return None
        
        return {
            'formatted_text': self.last_response,
            'text': self.last_response
        }
    
    def get_current_model(self):
        """Get current model name"""
        return "GPT-5 Mini"
    
    def close(self):
        """
        Close OpenAI connection
        """
        try:
            print("🔒 Closing OpenAI connection...")
            self.client = None
            self.is_ready = False
            self.last_response = None
            print("✅ OpenAI connection closed")
        except Exception as e:
            print(f"⚠️ Error closing OpenAI connection: {e}")

def main():
    """
    Test function untuk OpenAIBot
    """
    print("🤖 Testing OpenAI Bot with GPT-5 Mini")
    print("=" * 60)
    
    bot = OpenAIBot()
    
    # Setup
    if not bot.setup_driver():
        print("❌ Failed to setup OpenAI client")
        return
    
    # Initialize connection
    if not bot.open_openai():
        print("❌ Failed to initialize OpenAI connection")
        return
    
    # Test message
    test_message = "Hello, can you help me review some content? Please respond briefly."
    
    try:
        response = bot.send_message(test_message)
        print(f"\n✅ Response received from OpenAI:")
        print(f"{response}")
    except Exception as e:
        print(f"❌ Failed to send message: {e}")
    
    # Cleanup
    bot.close()

if __name__ == "__main__":
    main()
