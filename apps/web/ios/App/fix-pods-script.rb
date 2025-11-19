require 'xcodeproj'

project_path = 'App.xcodeproj'
project = Xcodeproj::Project.open(project_path)

# Find the main App target
target = project.targets.find { |t| t.name == 'App' }

if target
  # Find the "[CP] Embed Pods Frameworks" script phase
  embed_phase = target.shell_script_build_phases.find { |phase| 
    phase.name == '[CP] Embed Pods Frameworks' 
  }
  
  if embed_phase
    # Disable "Based on dependency analysis" by setting these flags
    embed_phase.always_out_of_date = true
    puts "✅ Fixed: [CP] Embed Pods Frameworks - Set to run on every build"
  else
    puts "⚠️  Could not find [CP] Embed Pods Frameworks phase"
  end
  
  project.save
  puts "✅ Project saved"
else
  puts "❌ Could not find App target"
end
