import re

with open('src/firebase.ts', 'r') as f:
    content = f.read()

replacement = """  } catch (error: any) {
    if (error?.code === 'auth/cancelled-popup-request' || error?.code === 'auth/popup-closed-by-user') {
      console.log('User cancelled sign-in popup.');
      return null;
    }
    console.error("Google Sign-In Error", error);
    throw error;
  }"""

content = re.sub(r'''  \} catch \(error\) \{
    console\.error\("Google Sign-In Error", error\);
    throw error;
  \}''', replacement, content)

with open('src/firebase.ts', 'w') as f:
    f.write(content)
