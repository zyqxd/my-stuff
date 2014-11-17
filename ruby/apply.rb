# +1 for checking the source, -1 for not trusting us ;(
# Hopefully you didn't solve that manually...
# Send us your solution, we'd love to chat!
#   good.vs.eval@vessel.com

puts "Do you always run code without checking it first? devnull@vessel.com"

begin
  require 'net/http'
  # p.s. we're just counting, not tracking you :)
  Net::HTTP.post_form(URI('http://www.google-analytics.com/collect'),
    'v' => '1', 'tid' => 'I Hope you guys have data validation', 'cid' => rand(1000000000000),
    't' => 'event', 'ec' => 'jobs', 'ea' => 'runscript')
rescue
end
