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

#outfit picker v2
gender_array = [{
  :gender => 'Men',
  :types => []
}, {
  :gender => 'Women',
  :types => []
}, {
  :gender => 'Boys',
  :types => []
}, {
  :gender => 'Girls',
  :types => []
}]
categories_array = [{
  :category => 'Winter Trip',
  :genders => gender_array.deep_dup
}, {
  :category => 'Christmas Morning',
  :genders => gender_array.deep_dup
}, {
  :category => 'Holiday Party',
  :genders => gender_array.deep_dup
}, {
  :category => 'Family Dinner',
  :genders => gender_array.deep_dup
}]
current_category_name = ""
current_category_count = -1
w = WatirFetcher.new
CSV.foreach('outfits.csv') do |row|
  if current_category_name != row[0]
    puts "Starting #{row[0]}"
    current_category_name = row[0]
    current_category_count += 1
  end

  current_category = categories_array[current_category_count]
  row[2..row.length].each_slice(5).with_index do |slice, index|
    if row[1] =~ /URL/
      # Data pipe and update the items hash array with new info
      slice.reject(&:blank?).each_with_index do |item, slice_index|
        if item.blank?
          puts "MISSING ITEM: #{item}"
          next
        elsif !item.strip.match(/^http:\/\/www.walmart.com\/ip\/.*\/\d+$/i)
          puts "BAD URL: #{item}"
          next
        end
        begin
          w.goto_url item.strip
          w.fetch_page
        rescue Timeout::Error
          puts "RETRY"
          retry
        end

        current_item = current_category[:genders][index][:types].last[:items][slice_index]
        puts "Fetching #{current_item[:name]}"
        current_item[:url] = item.strip
        description = w.xpath(".//section[@class='product-about js-about-item']/div[@class='js-ellipsis module']/p[1]").try(:inner_text).try(:strip)
        description = w.xpath(".//div[1]/span[@class='ql-details-short-desc']/p").try(:inner_text).try(:strip) unless description.present?
        current_item[:description] = description.present? ? description : nil
        price = w.xpath(".//div[@class='js-price-display price price-display']").try(:inner_text).try(:strip)
        price = w.xpath(".//div[@id='WM_PRICE']/div[@class='PricingInfo clearfix']/div/span[@class='clearfix camelPrice ']").try(:inner_text).try(:strip) unless price.present?
        current_item[:price] = price.present? ? price : nil
        image = w.xpath(".//img[@class='product-image js-product-image js-product-primary-image']/@src").try(:inner_text).try(:strip)
        image = w.xpath(".//a[@id='Zoomer']/@href").try(:inner_text).try(:strip) unless image.present?
        current_item[:image] = image.present? ? image : nil
        rating = w.xpath(".//div[@class='stars']/span").try(:inner_text).gsub(/\s+stars/,'')
        rating = w.xpath(".//div[@id='BVRRRatingOverall_Rating_Summary_1']/div[@class='BVRRRatingNormalImage']/img[@class='BVImgOrSprite']/@alt").try(:inner_text).try(:strip).split(" ")[0] unless rating.present?
        current_item[:rating] = rating.present? ? rating : nil
      end
    else
      next if slice.blank?
      # Insert each name as hashes
      current_type = {
        :type => row[1],
        :items => []
      }
      slice.reject(&:blank?).each do |item|
        puts item
        current_type[:items] << {
          :name => item.gsub(/\s+/,' ')
        }
      end
      current_category[:genders][index][:types] << current_type
    end
  end
end


categories_array = [{
  :category => 'Winter Trip',
  :genders => [{
    :gender => 'Men',
    :types => [{:type => 'Top'}, {:type => 'Outerwear'}, {:type => 'Bottoms'}, {:type => 'Shoes'}, {:type => 'Accessory'}]
  }, {
    :gender => 'Women',
    :types => [{:type => 'Top'}, {:type => 'Outerwear'}, {:type => 'Bottoms'}, {:type => 'Shoes'}, {:type => 'Accessory'}]
  }, {
    :gender => 'Boys',
    :types => [{:type => 'Top'}, {:type => 'Outerwear'}, {:type => 'Bottoms'}, {:type => 'Shoes'}, {:type => 'Accessory'}]
  }, {
    :gender => 'Girls',
    :types => [{:type => 'Top'}, {:type => 'Outerwear'}, {:type => 'Bottoms'}, {:type => 'Shoes'}, {:type => 'Accessory'}]
  }]
}, {
  :category => 'Christmas Morning',
  :genders => [{
    :gender => 'Men',
    :types => [{:type => 'Top'}, {:type => 'Bottom'}, {:type => 'Shoes'}, {:type => 'Sets'}]
  }, {
    :gender => 'Women',
    :types => [{:type => 'Top'}, {:type => 'Bottom'}, {:type => 'Shoes'}, {:type => 'Sets'}]
  }, {
    :gender => 'Boys',
    :types => [{:type => 'Top'}, {:type => 'Bottom'}, {:type => 'Shoes'}, {:type => 'Sets'}]
  }, {
    :gender => 'Girls',
    :types => [{:type => 'Top'}, {:type => 'Bottom'}, {:type => 'Shoes'}, {:type => 'Sets'}]
  }]
}, {
  :category => 'Holiday Party',
  :genders => [{
    :gender => 'Men',
    :types => [{:type => 'Top'}, {:type => 'Outerwear'}, {:type => 'Accessory'}, {:type => 'Shoes'}, {:type => 'Bottoms'}]
  }, {
    :gender => 'Women',
    :types => [{:type => 'Top'}, {:type => 'Outerwear'}, {:type => 'Accessory'}, {:type => 'Shoes'}, {:type => 'Bottoms'}]
  }, {
    :gender => 'Boys',
    :types => [{:type => 'Top'}, {:type => 'Outerwear'}, {:type => 'Accessory'}, {:type => 'Shoes'}, {:type => 'Bottoms'}]
  }, {
    :gender => 'Girls',
    :types => [{:type => 'Top'}, {:type => 'Outerwear'}, {:type => 'Accessory'}, {:type => 'Shoes'}, {:type => 'Bottoms'}]
  }]
}, {
  :category => 'Family Dinner',
  :genders => [{
    :gender => 'Men',
    :types => [{:type => 'Top'}, {:type => 'Bottom'}, {:type => 'Accessory'}, {:type => 'Shoes'}]
  }, {
    :gender => 'Women',
    :types => [{:type => 'Top'}, {:type => 'Bottom'}, {:type => 'Accessory'}, {:type => 'Shoes'}]
  }, {
    :gender => 'Boys',
    :types => [{:type => 'Top'}, {:type => 'Bottom'}, {:type => 'Accessory'}, {:type => 'Shoes'}]
  }, {
    :gender => 'Girls',
    :types => [{:type => 'Top'}, {:type => 'Bottom'}, {:type => 'Accessory'}, {:type => 'Shoes'}]
  }]
}]

headers = []
w = WatirFetcher.new
CSV.foreach('outfit_final.csv') do |row|
  if headers.blank?
    headers = row
    next
  end

  gender_index = get_gender row[0]
  row[1..row.length].each_slice(2).with_index do |slice, index|
    next if slice.reject(&:blank?).blank?
    category_index = get_category index
    type_index = get_type index

    puts "Inserting into #{gender_index} #{category_index} for #{type_index}"
    begin
      w.goto_url slice[1].strip
      w.fetch_page
    rescue Timeout::Error
      puts "RETRY"
      retry
    end
    current_item = {}
    current_item[:name] = slice[0].strip
    current_item[:url] = slice[1].strip
    description = w.xpath(".//section[@class='product-about js-about-item']/div[@class='js-ellipsis module']/p[1]").try(:inner_text).try(:strip)
    description = w.xpath(".//div[1]/span[@class='ql-details-short-desc']/p").try(:inner_text).try(:strip) unless description.present?
    current_item[:description] = description.present? ? description : nil
    price = w.xpath(".//div[@class='js-price-display price price-display']").try(:inner_text).try(:strip)
    price = w.xpath(".//div[@id='WM_PRICE']/div[@class='PricingInfo clearfix']/div/span[@class='clearfix camelPrice ']").try(:inner_text).try(:strip) unless price.present?
    current_item[:price] = price.present? ? price : nil
    image = w.xpath(".//img[@class='product-image js-product-image js-product-primary-image']/@src").try(:inner_text).try(:strip)
    image = w.xpath(".//a[@id='Zoomer']/@href").try(:inner_text).try(:strip) unless image.present?
    current_item[:image] = image.present? ? image : nil
    rating = w.xpath(".//div[@class='stars']/span").try(:inner_text).gsub(/\s+stars/,'')
    rating = w.xpath(".//div[@id='BVRRRatingOverall_Rating_Summary_1']/div[@class='BVRRRatingNormalImage']/img[@class='BVImgOrSprite']/@alt").try(:inner_text).try(:strip).split(" ")[0] unless rating.present?
    current_item[:rating] = rating.present? ? rating : nil

    categories_array[category_index][:genders][gender_index][:types][type_index][:items] ||= []
    categories_array[category_index][:genders][gender_index][:types][type_index][:items] << current_item
  end
end

def get_gender( name )
  if name =~ /Male/
    0
  elsif name =~ /Female/
    1
  elsif name =~ /Boys/
    2
  elsif name =~ /Girls/
    3
  end
end

def get_category( index )
  temp = index * 2 + 1
  if temp > 0 && temp < 11
    0
  elsif temp > 10 && temp < 19
    1
  elsif temp > 18 && temp < 29
    2
  elsif temp > 28 && temp < 37
    3
  end
end

def get_type( index )
  if index < 5
    index
  elsif index < 9
    index - 5
  elsif index < 14
    index - 9
  elsif index < 19
    index - 14
  end
end







# Create holiday countdown
w = WatirFetcher.new()
category = ""
types = ['mens','ladies','kids']
arr = []
cat_hash = {}
CSV.foreach("countdown.csv",:headers => true) do |row|
  if category != row[0]
    arr << cat_hash

    # reset
    category = row[0]
    cat_hash = {
      :name => "category",
      :mens => [],
      :ladies => [],
      :kids => []
    }
  end

  row.fields[1..row.length].each_slice(2).with_index do |item, index|
    w.goto_url item[1]
    w.fetch_page
    puts "Fetched page for #{item[0]}"
    current_item = {:name => item[0]}
    puts "Fetching #{current_item[:name]}"
        current_item[:url] = item.strip
        description = w.xpath(".//section[@class='product-about js-about-item']/div[@class='js-ellipsis module']/p[1]").try(:inner_text).try(:strip)
        description = w.xpath(".//div[1]/span[@class='ql-details-short-desc']/p").try(:inner_text).try(:strip) unless description.present?
        current_item[:description] = description.present? ? description : nil

        price = w.xpath(".//div[@class='js-price-display price price-display']").try(:inner_text).try(:strip)
        price = w.xpath(".//div[@id='WM_PRICE']/div[@class='PricingInfo clearfix']/div/span[@class='clearfix camelPrice ']").try(:inner_text).try(:strip) unless price.present?
        current_item[:price] = price.present? ? price : nil

        image = w.xpath(".//img[@class='product-image js-product-image js-product-primary-image']/@src").try(:inner_text).try(:strip)
        image = w.xpath(".//a[@id='Zoomer']/@href").try(:inner_text).try(:strip) unless image.present?
        current_item[:image] = image.present? ? image : nil

        rating = w.xpath(".//div[@class='stars']/span").try(:inner_text).gsub(/\s+stars/,'')
        rating = w.xpath(".//div[@id='BVRRRatingOverall_Rating_Summary_1']/div[@class='BVRRRatingNormalImage']/img[@class='BVImgOrSprite']/@alt").try(:inner_text).try(:strip).split(" ")[0] unless rating.present?
        current_item[:rating] = rating.present? ? rating : nil
    cat_hash[cat_hash.keys[index+1]] << item
  end
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