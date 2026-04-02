call npm -g i yarn
echo Prepare server
cd server
md node_modules
call yarn
cd ..
echo Prepare client
cd client
md node_modules
call yarn
cd ..
