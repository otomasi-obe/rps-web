#!/bin/bash
set -e

# Log output to file as well as stdout
exec > >(tee -a /root/install_all.log) 2>&1

echo "==========================================="
echo "      Starting All-in-One Setup"
echo "==========================================="

# ------------------------------------------------------------------
# PART 1: System Base & Essentials
# ------------------------------------------------------------------
echo ">>> [1/7] Updating System & Installing Essentials..."

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get upgrade -y

echo "Installing apt packages..."
apt-get install -y \
  git curl wget unzip zip build-essential software-properties-common \
  lsb-release gnupg python3 python3-pip python3-venv python3-dev \
  openjdk-17-jdk maven gradle postgresql postgresql-contrib \
  redis-server nginx

# ------------------------------------------------------------------
# PART 2: NVM & Node.js (18, 20, 22, 24, 25)
# ------------------------------------------------------------------
echo ">>> [2/7] Installing NVM & Node.js versions..."

export NVM_DIR="$HOME/.nvm"

# Install NVM if not exists
if [ ! -d "$NVM_DIR" ]; then
    echo "Installing NVM..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
else
    echo "NVM already installed."
fi

# Load NVM
if [ -s "$NVM_DIR/nvm.sh" ]; then
    \. "$NVM_DIR/nvm.sh"
else
    echo "Error: NVM script not found at $NVM_DIR/nvm.sh"
    exit 1
fi

echo "Installing Node.js versions: 18, 20, 22, 24, 25..."
# Loop to install versions
for ver in 18 20 22 24 25; do
    echo "Installing Node $ver..."
    nvm install $ver
done

# Set Node 18 as default (or optional preference, usually LTS is safer for system)
nvm alias default 20
nvm use 20

echo "Installing global npm packages..."
npm install -g yarn pm2

# ------------------------------------------------------------------
# PART 3: ROS2 Humble
# ------------------------------------------------------------------
echo ">>> [3/7] Installing ROS2 Humble..."

# Add ROS2 GPG key
if [ ! -f /usr/share/keyrings/ros-archive-keyring.gpg ]; then
    curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key -o /usr/share/keyrings/ros-archive-keyring.gpg
fi

# Add Repo
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] http://packages.ros.org/ros2/ubuntu $(lsb_release -cs) main" > /etc/apt/sources.list.d/ros2.list

apt-get update

# Install ROS2 Packages
apt-get install -y ros-humble-desktop-full \
  ros-humble-turtlebot3-msgs \
  ros-humble-turtlebot3 \
  ros-humble-moveit \
  ros-humble-navigation2 \
  ros-humble-nav2-bringup \
  ros-humble-slam-toolbox \
  ros-humble-cartographer \
  ros-humble-robot-localization \
  ros-humble-gazebo-ros \
  ros-humble-ros-gz-bridge \
  ros-humble-cv-bridge \
  ros-humble-image-transport \
  ros-humble-pcl-ros \
  ros-humble-laser-filters

# Setup bashrc for ROS2
if ! grep -q "source /opt/ros/humble/setup.bash" /root/.bashrc; then
  echo "source /opt/ros/humble/setup.bash" >> /root/.bashrc
fi

if ! grep -q "export TURTLEBOT3_MODEL=waffle_pi" /root/.bashrc; then
  echo "export TURTLEBOT3_MODEL=waffle_pi" >> /root/.bashrc
fi

# ------------------------------------------------------------------
# PART 4: Python Environment
# ------------------------------------------------------------------
echo ">>> [4/7] Setting up Python Environment..."

VENV_PATH="/root/ros2-robotics-venv"

if [ ! -d "$VENV_PATH" ]; then
    echo "Creating virtual environment at $VENV_PATH..."
    python3 -m venv "$VENV_PATH"
fi

echo "Installing Python packages..."
# Install using the venv pip
PIP="$VENV_PATH/bin/pip"
$PIP install --upgrade pip

# ML packages
$PIP install tensorflow==2.13.0
$PIP install torch==2.0.0+cpu torchvision==0.15.0+cpu torchaudio==2.0.0+cpu --extra-index-url https://download.pytorch.org/whl/cpu
$PIP install opencv-python==4.8.0.76
$PIP install ultralytics

# Data Science Utils
$PIP install numpy scipy pandas matplotlib scikit-learn scikit-image jupyter jupyterlab

# ------------------------------------------------------------------
# PART 5: Services & Services Status
# ------------------------------------------------------------------
echo ">>> [5/7] Configuring Services..."

systemctl enable --now postgresql
systemctl enable --now redis-server
systemctl enable --now nginx

# ------------------------------------------------------------------
# PART 6: Repositories (Otomasi-IoT & Otomasi-OBE)
# ------------------------------------------------------------------
echo ">>> [6/7] Cloning Repositories & Installing Dependencies..."

# Function to recursively install dependencies
install_dependencies() {
    local target_dir=$1
    echo "Scanning for dependencies in: $target_dir"

    find "$target_dir" -maxdepth 2 -type d | while read -r dir; do
        if [ -f "$dir/package.json" ]; then
            echo "Found package.json in $dir. Running npm install..."
            (cd "$dir" && npm install) || echo "WARNING: npm install failed in $dir"
        fi

        if [ -f "$dir/requirements.txt" ]; then
            echo "Found requirements.txt in $dir. Running pip install..."
            # Use strict system pip or venv? User said "without docker".
            # Usually better to use a venv, but user didn't specify one for these services.
            # We will use the system pip but with --break-system-packages or just warn.
            # OR better, since we have a venv for robotics, maybe use that?
            # User said "install all requirements in folder... otomasi-iot" separately.
            # We'll try just pip install. If it fails due to PEP 668, we might need a flag.
            (cd "$dir" && pip install -r requirements.txt --break-system-packages) || echo "WARNING: pip install failed in $dir"
        fi

        # For Java, full build is heavy. Just resolve dependencies.
        if [ -f "$dir/pom.xml" ]; then
            echo "Found pom.xml in $dir. Resolving Maven dependencies..."
            (cd "$dir" && mvn dependency:resolve) || echo "WARNING: mvn dependency failed in $dir"
        fi
    done
}

# --- A. Otomasi-IoT ---
TOOLS_DIR="/root/otomasi/otomasi-iot"
mkdir -p "$TOOLS_DIR"
chown -R root:root "$TOOLS_DIR"

echo "Cloning IoT repositories to $TOOLS_DIR..."
cd "$TOOLS_DIR"
iot_repos=(
  "https://github.com/otomasi-iot/thingsboard.git"
  "https://github.com/otomasi-iot/thingsboard-edge.git"
  "https://github.com/otomasi-iot/thingsboard-gateway.git"
  "https://github.com/otomasi-iot/thingsboard-client-sdk.git"
  "https://github.com/otomasi-iot/thingsboard-python-client-sdk.git"
  "https://github.com/otomasi-iot/thingsboard-python-rest-client.git"
  "https://github.com/otomasi-iot/thingsboard-micropython-client-sdk.git"
  "https://github.com/otomasi-iot/flutter_thingsboard_app.git"
  "https://github.com/otomasi-iot/thingsboard.github.io.git"
  "https://github.com/otomasi-iot/thingsboard-mcp.git"
  "https://github.com/otomasi-iot/thingsboard-pe-k8s.git"
  "https://github.com/otomasi-iot/deploy-fix.git"
  "https://github.com/otomasi-iot/custom-oauth2-mapper.git"
  "https://github.com/otomasi-iot/kafka-streams-example.git"
  "https://github.com/otomasi-iot/database-migrator.git"
  "https://github.com/otomasi-iot/thingsboard-udp-loadbalancer.git"
)

for repo in "${iot_repos[@]}"; do
    dir_name=$(basename "$repo" .git)
    if [ ! -d "$dir_name" ]; then
        git clone "$repo"
    else
        echo "$dir_name already exists."
    fi
done

# Install dependencies for IoT
install_dependencies "$TOOLS_DIR"


# --- B. Otomasi-OBE ---
OBE_DIR="/root/otomasi/otomasi-obe"
mkdir -p "$OBE_DIR"
chown -R root:root "$OBE_DIR"

echo "Cloning OBE repositories to $OBE_DIR..."
cd "$OBE_DIR"
obe_repos=(
    "https://github.com/otomasi-obe/rps-web.git"
)

for repo in "${obe_repos[@]}"; do
    dir_name=$(basename "$repo" .git)
    if [ ! -d "$dir_name" ]; then
        git clone "$repo"
    else
        echo "$dir_name already exists."
    fi
done

# Install dependencies for OBE
install_dependencies "$OBE_DIR"


# ------------------------------------------------------------------
# PART 7: Verification
# ------------------------------------------------------------------
echo ">>> [7/7] Verification..."

echo "--- System & Node ---"
echo "Node: $(node -v)"
echo "NPM: $(npm -v)"
echo "NVM: $(nvm --version)"
echo "Nodes Installed:"
nvm list

echo "--- ROS2 Humble ---"
if [ -f /opt/ros/humble/setup.bash ]; then
    echo "ROS2 Installed."
    source /opt/ros/humble/setup.bash
    ros2 pkg list | grep -E "turtlebot3|moveit|nav2|slam_toolbox" | wc -l || echo "Packages check failed cmd"
else
    echo "ROS2 Setup file MISSING!"
fi

echo "--- Python Environment ---"
if [ -d "$VENV_PATH" ]; then
    echo "Venv exists at $VENV_PATH"
else
    echo "Venv MISSING!"
fi

echo "--- Repositories ---"
echo "Otomasi-IoT count: $(ls $TOOLS_DIR | wc -l)"
echo "Otomasi-OBE count: $(ls $OBE_DIR | wc -l)"

echo "==========================================="
echo "Setup Complete!"
echo "Log saved to /root/install_all.log"
