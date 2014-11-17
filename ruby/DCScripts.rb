# Home Depot Tree Orndament thing
def create_data(language)
  api = MerchantApi::HomeDepotCanada.new()
  CSV.open("out_#{language}.csv",'wb') do |out|
    out << ["sku","category","name","url","original_price","current_price","image_url"]
    CSV.foreach('data.csv', :headers => true) do |row|
      sku = row['sku']
      response = api.product(sku,:language => language)
      if response.blank?
        out << []
        next
      end
      if (language == 'fr')
        response[:original_price].gsub!(".",",")
        response[:current_price].gsub!(".",",")
      end
      data = {
          :sku => sku,
          :category => row['category'],
          :name => response[:name],
          :url => response[:url],
          :original_price => response[:original_price],
          :current_price => response[:current_price],
          :image_url => response[:large_image_url]
      }.values
      puts data.join(" ")
      out << data
    end
  end
end
create_data('en')


# Home Depot Wink thing
def create_data(language)
  api = MerchantApi::HomeDepotCanada.new
  browser = WatirFetcher.new
  arr = []
  CSV.open("out_#{language}.csv",'wb') do |out|
    out << ["sku","category","class","name","description","original_price","current_price","image_url","url"]
    CSV.foreach('wink_items.csv', :headers => true) do |row|
      sku = row['sku']
      response = api.product(sku,:language => language)
      if response.blank?
        puts sku
        next
      end

      browser.goto_url response[:url]
      browser.fetch_page
      data = browser.xpath(".//div[@id='BVRRRatingOverall_Rating_Summary_1']/div[@class='BVRRRatingNormalOutOf']")
      rating = data.inner_text.split("\n").first.strip if data.present?
      data = browser.xpath(".//div[@class='column main-info']/p[@class='product-sold']/span/text()")
      availability = data.inner_text.strip if data.present?
      data = {
          :sku => sku,
          :category => row['category'],
          :class => row['class'],
          :name => response[:name],
          :description => row['description'],
          :original_price => response[:original_price].gsub(/.0$/,".00"),
          :current_price => response[:current_price].gsub(/.0$/,".00"),
          :image_url => response[:large_image_url],
          :url => response[:url],
          :rating => rating,
          :availability => availability
      }
      arr << data
    end
  end
  options = {
    :data => arr,
    :store_ids => ['lol'],
    :data_type => "data"
  }
  Dc::DataUpload::TargetCanadaTopTen.new(19191, 236, options).start
end
create_data('en')


# big lots gift baskets
def create_data
  data = []
  current_basket = ""
  current_data = []
  CSV.foreach('baskets.csv', :headers => true) do |row|
    current_basket = row['basket_name'] if current_basket != row['basket_name']
    if row['basket_name'] == row['display_name']
      hash = {
        :name => row['display_name'],
        :description => row['meta'],
        :image_url => row['image_url'],
        :item_url => row['item_url'],
        :items => []
      }
      data << hash
    else
      basket = data.last
      hash = {
        :name => row['display_name'],
        :sku => row['meta'].split(",").each(&:strip),
        :price => row['price'],
        :image_url => row['image_url'],
        :item_url => row['item_url']
      }
      basket[:items] << hash
    end
  end
end



#radio shack
def create_data
  data = []
  browser = WatirFetcher.new
  CSV.foreach('sportschek.csv',:headers=>true) do |row|
    cats = row['category'].split(",").each(&:strip)
    browser.goto_url row['item_url']
    browser.fetch_page

    reviews = browser.xpath(".//div[@class='pr-snippet-stars']/span").inner_text.strip
    description = browser.xpath(".//div[@id='descriptionContent']/div[1]/p[2]").inner_text.strip
    img_url = browser.xpath(".//div[@id='main-img']/img[@id='mainProductImage']/@src").inner_text.strip
    price = browser.xpath(".//div[@id='summary_price']/p[@class='p-v our-price']/span[@class='value price']").inner_text.strip
    hash = {
      :tempurature => cats[0],
      :precipitation => cats[1],
      :gender => row['gender'],
      :name => row['name'],
      :item_url => row['item_url'],
      :reviews => reviews,
      :description => description,
      :image_url => img_url,
      :price => price
    }
  end

  data.to_json
end











# Fudge UAT

fr_id = [31289]
fr_id.each do |id|
  fr = FlyerRun.find id
  fr.available_from = 4.days.ago
  fr.available_to = 400.years.from_now
  fr.state = 100
  fr.hide_in_hosted = false
  fr.flyer_type.hide_in_hosted = false
  fr.flyer_type.save!
  fr.save!

  fr.flyers.each do |f|
    f.available_from = 4.days.ago
    f.available_to = 400.years.from_now
    raise "lol" if f.stores.blank?
    f.save!
  end
end


###########
# @KROGER #
###########

# kroger
kroger = Merchant.find_by_name_identifier "kroger"
kroger.url = "https://www.kroger.com/"
kroger.merchant_custom_setting = MerchantCustomSetting.new() if kroger.merchant_custom_setting.blank?
kroger.merchant_custom_setting.custom_base_url = nil
kroger.merchant_custom_setting.default_chrome = "broadsheet"
kroger.merchant_custom_setting.custom_base_url = 'wklyads-test.kroger.com'
kroger.merchant_custom_setting.grid_view = true
kroger.merchant_custom_setting.save!
kroger.save!
flyer_theme = kroger.flyer_themes.first
flyer_theme.layout_name = "kroger"
flyer_theme.mobile_layout_name = "kroger"
flyer_theme.save!
kroger.flyer_types.each { |ft|
    ft.display_discount_slider = true
    ft.pdf_generation_enabled = true
    ft.shopping_cart_enabled = true
    ft.shopping_list_type = 1
    ft.grocery_list = true
    ft.display_discount_slider = true
    ft.flyer_theme_id = flyer_theme.id
    ft.save!
    ft.flyer_runs.each { |fr|
        fr.available_to = 40.days.from_now
        fr.available_from = 10.days.ago
        fr.state = 100 if fr.state != 0
        raise "fr " + fr.id if fr.flyers.blank?
        fr.flyers.each { |f|
            if f.id == 252274
                f.available_to = 40.days.from_now
                f.available_from = 10.days.ago
                f.fsas = "26003"
                f.save!
                else
                f.available_to = 10.days.ago
                f.available_from = 40.days.ago
            end
            f.save!
        }
        fr.save!
    }
}
# ralphs/ kingsoopers/ smiths 2550,2582,2553,
mids = [2392,2550,2582,2553]
mids.each do |mid|
    m = Merchant.find mid
    m.url = "http://www.flyertown.ca/" if m.url.blank?
    m.save!
    m.merchant_custom_setting = MerchantCustomSetting.new() if m.merchant_custom_setting.blank?
    m.merchant_custom_setting.default_chrome = "broadsheet"
    #m.merchant_custom_setting.custom_base_url = 'wklyads-test.ralphs.com'
    #wklyads-test.smithsfoodanddrug.com
    #wklyads-test.fredmeyer.com

    #wklyads-test.ralphs.com
    m.merchant_custom_setting.grid_view = true
    m.merchant_custom_setting.save!
    raise "m " + mid if m.flyer_types.blank?
    m.flyer_types.each { |ft|
        ft.display_discount_slider = true
        ft.pdf_generation_enabled = true
        ft.shopping_cart_enabled = true
        ft.shopping_list_type = 0
        ft.grocery_list = true
        ft.display_discount_slider = true
        ft.flyer_theme_id = flyer_theme.id
        ft.hide_in_hosted = false
        ft.save!
        ft.flyer_runs.each { |fr|
            fr.available_to = 40.days.from_now
            fr.available_from = 10.days.ago
            fr.hide_in_hosted = false
            fr.save!
            fr.flyers.each { |f|
                f.available_to = 40.days.from_now
                f.available_from = 10.days.ago
                puts "yes"
                dc = Dc::FlyerTear.where(:flyer_id => f.id, :deleted => false).first
                if dc.present?
                    dc.options["handle_background"] = "ffffff"
                    dc.options["bg_color"] = "bf1219"
                    dc.save!
                end
                f.save!
            }
        }
    }
end