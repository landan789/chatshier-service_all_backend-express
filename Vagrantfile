Vagrant.configure("2") do |config|
	
  config.vm.box = "centos/7"
  config.vm.network "forwarded_port", adapter: 1, guest: 22, host: 2222, id: "ssh"
  #config.vm.network "forwarded_port", adapter: 1, guest: 80, host: 80
  config.vm.network "forwarded_port", adapter: 1, guest: 3000, host: 3000, protocol: "tcp"  # nodejs 3000 不能指定 guest_ip, host_ip， 需要讓她綁訂在 使得區網電腦也能夠連
  config.vm.network "forwarded_port", adapter: 1, guest: 3000, host: 3000, protocol: "udp"
  config.vm.network "forwarded_port", adapter: 1, guest: 3001, host: 3001
  config.vm.network "forwarded_port", adapter: 1, guest: 3002, host: 3002



  config.vm.hostname = "fea.chatshier.com"
  config.vm.synced_folder "../project", "/home/vagrant/www"
  
  config.ssh.username = "vagrant"
  config.ssh.password = "vagrant"
  
  config.vm.provider "virtualbox" do |vb|
  	vb.name = "9thflr"
    vb.gui = false
    vb.cpus = 2
    vb.memory = "2048"
  end


end


