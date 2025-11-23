$MavenVersion = "3.9.6"
$MavenUrl = "https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/$MavenVersion/apache-maven-$MavenVersion-bin.zip"
$MavenZip = "maven.zip"
$MavenDir = "apache-maven-$MavenVersion"

$JdkVersion = "17.0.10_7"
$JdkUrl = "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.10%2B7/OpenJDK17U-jdk_x64_windows_hotspot_17.0.10_7.zip"
$JdkZip = "openjdk.zip"
$JdkDir = "jdk-17.0.10+7"

# 1. Setup Java
Write-Host "Checking for Java..."
try {
    $javaVersion = java -version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Java is already installed."
    }
    else {
        throw "Java not found"
    }
}
catch {
    if (-not (Test-Path $JdkDir)) {
        Write-Host "Java not found. Downloading OpenJDK 17..."
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $JdkUrl -OutFile $JdkZip
        
        Write-Host "Extracting JDK..."
        Expand-Archive -Path $JdkZip -DestinationPath . -Force
        Remove-Item $JdkZip
    }
    
    # Find the actual directory name inside (it might vary slightly)
    $extractedJdk = Get-ChildItem -Directory | Where-Object { $_.Name -like "jdk-17*" } | Select-Object -First 1
    $JdkPath = "$PWD\$($extractedJdk.Name)"
    
    Write-Host "Setting JAVA_HOME to $JdkPath"
    $env:JAVA_HOME = $JdkPath
    $env:PATH = "$JdkPath\bin;$env:PATH"
}

# 2. Setup Maven
Write-Host "Checking for Maven..."
if (-not (Test-Path $MavenDir)) {
    Write-Host "Maven not found. Downloading Maven $MavenVersion..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $MavenUrl -OutFile $MavenZip
    
    Write-Host "Extracting Maven..."
    Expand-Archive -Path $MavenZip -DestinationPath . -Force
    Remove-Item $MavenZip
}

$MvnCmd = ".\$MavenDir\bin\mvn.cmd"

# 3. Run App
Write-Host "Starting Spring Boot Application..."
& $MvnCmd spring-boot:run
