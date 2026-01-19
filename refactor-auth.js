import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(__dirname, 'src');

// Replacements to make
const replacements = [
  { find: /const\s+{\s*activeCompanyId\s*}\s*=\s*useAuth\(/g, replace: 'const { companyId } = useAuth(' },
  { find: /const\s+{\s*activeCompanyId,\s*activeRole\s*}\s*=\s*useAuth\(/g, replace: 'const { companyId, role } = useAuth(' },
  { find: /const\s+{\s*activeCompanyId,\s*activeRole,\s*activeCompany\s*}\s*=\s*useAuth\(/g, replace: 'const { companyId, role, company } = useAuth(' },
  { find: /const\s+{\s*activeRole,\s*activeCompanyId\s*}\s*=\s*useAuth\(/g, replace: 'const { role, companyId } = useAuth(' },
  { find: /const\s+{\s*firebaseUser,\s*activeCompany\s*}\s*=\s*useAuth\(/g, replace: 'const { user, company } = useAuth(' },
  { find: /const\s+{\s*user,\s*signOutUser,\s*activeRole,\s*isPlatformAdmin,\s*authRole,\s*activeCompanyId\s*}\s*=\s*useAuth\(/g, replace: 'const { user, logout, role, companyId } = useAuth(' },
  { find: /const\s+{\s*user,\s*signOutUser\s*}\s*=\s*useAuth\(/g, replace: 'const { user, logout } = useAuth(' },
  { find: /const\s+{\s*user,\s*companyMemberships,\s*setActiveCompanyId,\s*signOutUser\s*}\s*=\s*useAuth\(/g, replace: 'const { user, companyId } = useAuth(' },
  { find: /const\s+{\s*activeRole\s*}\s*=\s*useAuth\(/g, replace: 'const { role } = useAuth(' },
  { find: /const\s+{\s*user,\s*activeCompany\s*}\s*=\s*useAuth\(/g, replace: 'const { user, company } = useAuth(' },
  { find: /const\s+{\s*firebaseUser,\s*authLoading\s*}\s*=\s*useAuth\(/g, replace: 'const { user, isLoading } = useAuth(' },
  { find: /const\s+{\s*firebaseUser,\s*activeCompanyId,\s*companyMemberships\s*}\s*=\s*useAuth\(/g, replace: 'const { user, companyId } = useAuth(' },
  { find: /const\s+{\s*onboardingError\s*}\s*=\s*useAuth\(/g, replace: 'const { error } = useAuth(' },
  { find: /const\s+{\s*isPlatformAdmin\s*}\s*=\s*useAuth\(/g, replace: 'const auth = useAuth();' },
  { find: /const\s+{\s*authRole,\s*isPlatformAdmin\s*}\s*=\s*useAuth\(/g, replace: 'const auth = useAuth();' },
  
  // Usage replacements (order matters - do longer ones first)
  { find: /(?<!\w)activeCompanyId(?!\w)/g, replace: 'companyId' },
  { find: /(?<!\w)activeRole(?!\w)/g, replace: 'role' },
  { find: /(?<!\w)firebaseUser(?!\w)/g, replace: 'user' },
  { find: /(?<!\w)signOutUser(?!\w)/g, replace: 'logout' },
  { find: /(?<!\w)activeCompany(?!\w)/g, replace: 'company' },
];

function processFilesInDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processFilesInDirectory(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      let content = fs.readFileSync(filePath, 'utf8');
      const original = content;
      
      replacements.forEach(({ find, replace }) => {
        content = content.replace(find, replace);
      });
      
      if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ Updated: ${path.relative(__dirname, filePath)}`);
      }
    }
  });
}

processFilesInDirectory(SRC_DIR);
console.log('\nRefactoring complete!');
